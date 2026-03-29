/**
 * B站直播推流API (无状态，通过API进行扫码登录和操作)
 *
 * 版本：4.5.0 (Buvid主动获取修复)
 * 功能：
 * 1. 在登录流程开始前，主动调用B站接口获取buvid3，确保设备标识的稳定性。
 * 2. 提供获取登录二维码和唯一Token的接口。
 * 3. 提供查询扫码状态的接口，成功后从响应头的Set-Cookie中正确解析凭据，并保存到本地。
 * 4. 开播/关播/获取分区接口需要通过POST请求传入必要的Cookie凭据来执行操作。
 */

import express, { Request, Response } from "express";
import axios from "axios";
import qrcode from "qrcode";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { URLSearchParams } from "url";

// --- 配置和常量 ---
const PORT = process.env.PORT || 12345;
const LOGIN_TOKEN_EXPIRATION = 10 * 60 * 1000; // 10分钟

// --- Bilibili API 常量 ---
const BILI_API_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    Origin: "https://link.bilibili.com",
    Referer: "https://link.bilibili.com/p/center/index",
};

const URLS = {
    GET_BUVID: "https://api.bilibili.com/x/web-frontend/getbuvid", // <-- 新增
    QR_GENERATE:
        "https://passport.bilibili.com/x/passport-login/web/qrcode/generate",
    QR_POLL: "https://passport.bilibili.com/x/passport-login/web/qrcode/poll",
    GET_PARTITIONS: "https://api.live.bilibili.com/room/v1/Area/getList",
    UPDATE_TITLE: "https://api.live.bilibili.com/room/v1/Room/update",
    START_LIVE: "https://api.live.bilibili.com/room/v1/Room/startLive",
    STOP_LIVE: "https://api.live.bilibili.com/room/v1/Room/stopLive",
};

// --- 类型定义和会话管理 ---

interface BiliAuthCredentials {
    SESSDATA: string;
    bili_jct: string;
    DedeUserID: string;
    buvid3: string;
}

// LoginSession现在需要保存预先获取的buvid3
interface LoginSession {
    qrKey: string;
    status: "PENDING" | "SCANNED" | "SUCCESS" | "EXPIRED";
    preFetchedBuvid: string; // <-- 新增
    credentials?: BiliAuthCredentials;
}

const loginSessions = new Map<string, LoginSession>();

function parseCookies(
    setCookieHeader: string[] | undefined,
): Partial<BiliAuthCredentials> {
    const credentials: Partial<BiliAuthCredentials> = {};
    if (!setCookieHeader) return credentials;
    setCookieHeader.forEach((cookieString) => {
        const cookiePair = cookieString.split(";")[0];
        const parts = cookiePair.split("=");
        const key = parts.shift()?.trim();
        const value = parts.join("=").trim();
        if (
            key &&
            (key === "SESSDATA" ||
                key === "bili_jct" ||
                key === "DedeUserID" ||
                key === "buvid3")
        ) {
            credentials[key as keyof BiliAuthCredentials] = value;
        }
    });
    return credentials;
}

// --- Express 应用设置 ---
const app = express();
app.use(express.json());

// --- API 路由 ---

app.get("/", (req: Request, res: Response) => {
    res
        .status(200)
        .send(
            "Bilibili Live Stream API v4.5 is running. Use /api/login/qrcode to start.",
        );
});

/**
 * API: 获取登录二维码 (已修改: 主动获取buvid3)
 * @route GET /api/login/qrcode
 */
app.get("/api/login/qrcode", async (req: Request, res: Response) => {
    try {
        // 1. 主动获取buvid3
        console.log("Proactively fetching buvid3...");
        const buvidResponse = await axios.get(URLS.GET_BUVID, {
            headers: BILI_API_HEADERS,
        });
        const preFetchedBuvid = buvidResponse.data?.data?.buvid;
        if (!preFetchedBuvid) {
            throw new Error("Failed to pre-fetch buvid3 from Bilibili API.");
        }
        console.log(`Successfully fetched buvid3: ${preFetchedBuvid}`);

        // 2. 请求B站生成二维码，并带上buvid3
        const genResponse = await axios.get(URLS.QR_GENERATE, {
            headers: { ...BILI_API_HEADERS, Cookie: `buvid3=${preFetchedBuvid}` },
        });
        const { url, qrcode_key } = genResponse.data.data;

        // 3. 存储会话，包含预获取的buvid3
        const token = crypto.randomBytes(16).toString("hex");
        const qrCodeBase64 = await qrcode.toDataURL(url);

        loginSessions.set(token, {
            qrKey: qrcode_key,
            status: "PENDING",
            preFetchedBuvid: preFetchedBuvid, // 保存buvid3
        });

        setTimeout(() => {
            loginSessions.delete(token);
            console.log(`Login session for token ${token} expired and was deleted.`);
        }, LOGIN_TOKEN_EXPIRATION);

        res.status(200).json({ token, qrcode: qrCodeBase64 });
    } catch (error: any) {
        console.error(
            "Error in /api/login/qrcode:",
            error.response?.data || error.message,
        );
        res
            .status(500)
            .json({ error: "Failed to generate QR code", details: error.message });
    }
});

/**
 * API: 查询扫码登录状态 (已修改: 使用预获取的buvid3作为后备)
 * @route GET /api/login/poll?token=<token>
 */
app.get("/api/login/poll", async (req: Request, res: Response) => {
    const { token } = req.query;
    if (typeof token !== "string" || !loginSessions.has(token)) {
        return res
            .status(404)
            .json({ code: -1, message: "Invalid or expired token." });
    }

    const session = loginSessions.get(token)!;
    if (session.status === "SUCCESS" && session.credentials) {
        return res.status(200).json(session.credentials);
    }

    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const pollResponse = await axios.get(URLS.QR_POLL, {
                params: { qrcode_key: session.qrKey },
                headers: {
                    ...BILI_API_HEADERS,
                    Cookie: `buvid3=${session.preFetchedBuvid}`,
                }, // 轮询也带上
                timeout: 5000,
            });

            const pollData = pollResponse.data.data;

            switch (pollData.code) {
                case 0: // 登录成功
                    const parsedCreds = parseCookies(pollResponse.headers["set-cookie"]);

                    // 关键修复: 如果Set-Cookie中没有buvid3，则使用预获取的那个
                    const finalBuvid3 = parsedCreds.buvid3 || session.preFetchedBuvid;

                    if (
                        parsedCreds.SESSDATA &&
                        parsedCreds.bili_jct &&
                        parsedCreds.DedeUserID &&
                        finalBuvid3
                    ) {
                        const finalCredentials: BiliAuthCredentials = {
                            SESSDATA: parsedCreds.SESSDATA,
                            bili_jct: parsedCreds.bili_jct,
                            DedeUserID: parsedCreds.DedeUserID,
                            buvid3: finalBuvid3,
                        };

                        session.status = "SUCCESS";
                        session.credentials = finalCredentials;
                        loginSessions.set(token, session);

                        try {
                            const cookieDir = path.join(__dirname, "cookie");
                            const filePath = path.join(
                                cookieDir,
                                `${finalCredentials.DedeUserID}.json`,
                            );
                            const fileContent = JSON.stringify(finalCredentials, null, 2);
                            await fs.mkdir(cookieDir, { recursive: true });
                            await fs.writeFile(filePath, fileContent, "utf-8");
                            console.log(
                                `Successfully saved credentials for UID ${finalCredentials.DedeUserID} to ${filePath}`,
                            );
                        } catch (ioError) {
                            console.error(
                                `[Warning] Failed to save cookie file for UID ${finalCredentials.DedeUserID}:`,
                                ioError,
                            );
                        }

                        return res.status(200).json(finalCredentials);
                    } else {
                        throw new Error(
                            `Login succeeded but required credentials missing. SESSDATA: ${!!parsedCreds.SESSDATA}, bili_jct: ${!!parsedCreds.bili_jct}, DedeUserID: ${!!parsedCreds.DedeUserID}, finalBuvid3: ${!!finalBuvid3}`,
                        );
                    }

                // 其他业务状态码
                case 86038:
          /* ... */ return res
                        .status(410)
                        .json({ code: 86038, message: "QR code expired." });
                case 86090:
          /* ... */ return res
                        .status(202)
                        .json({ code: 86090, message: "Scanned, pending confirmation." });
                case 86101:
          /* ... */ return res
                        .status(202)
                        .json({ code: 86101, message: "Waiting for scan." });
                default:
                    return res
                        .status(400)
                        .json({
                            code: pollData.code,
                            message: pollData.message || "Unknown polling status.",
                        });
            }
        } catch (error: any) {
            console.error(
                `Error polling login status (Attempt ${attempt}/${maxRetries}):`,
                error.message,
            );
            if (attempt === maxRetries) {
                return res
                    .status(500)
                    .json({
                        error: "Failed to poll login status after multiple retries.",
                        details: error.message,
                    });
            }
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
    }
});

// 为了让你方便复制，这里补全省略的接口
app.post("/api/partitions", async (req: Request, res: Response) => {
    const { SESSDATA, bili_jct, DedeUserID, buvid3 } = req.body;
    if (!SESSDATA || !bili_jct || !DedeUserID || !buvid3) {
        return res
            .status(400)
            .json({ error: "Missing authentication parameters in request body." });
    }
    const cookie = `SESSDATA=${SESSDATA}; bili_jct=${bili_jct}; DedeUserID=${DedeUserID}; buvid3=${buvid3};`;
    const userHeaders = { ...BILI_API_HEADERS, Cookie: cookie };
    try {
        const response = await axios.get(URLS.GET_PARTITIONS, {
            headers: userHeaders,
            params: { show_pinyin: 1 },
        });
        if (response.data.code === 0) {
            res.status(200).json(response.data);
        } else {
            res.status(400).json({
                error: "Failed to fetch partitions.",
                details: response.data.message || "Unknown error.",
                biliResponse: response.data,
            });
        }
    } catch (error: any) {
        console.error(
            "Error in /api/partitions:",
            error.response?.data || error.message,
        );
        res
            .status(500)
            .json({
                error: "Internal server error",
                details: error.response?.data || error.message,
            });
    }
});

app.post("/api/start-stream", async (req: Request, res: Response) => {
    const { SESSDATA, bili_jct, DedeUserID, buvid3, roomId, partitionId, title } =
        req.body;
    if (
        !SESSDATA ||
        !bili_jct ||
        !DedeUserID ||
        !buvid3 ||
        !roomId ||
        !partitionId ||
        !title
    ) {
        return res
            .status(400)
            .json({ error: "Missing required parameters in request body." });
    }
    const cookie = `SESSDATA=${SESSDATA}; bili_jct=${bili_jct}; DedeUserID=${DedeUserID}; buvid3=${buvid3};`;
    const csrf = bili_jct;
    const userHeaders = { ...BILI_API_HEADERS, Cookie: cookie };
    try {
        const titleParams = new URLSearchParams({
            room_id: roomId,
            title,
            platform: "pc_link",
            csrf_token: csrf,
            csrf,
        }).toString();
        await axios.post(URLS.UPDATE_TITLE, titleParams, { headers: userHeaders });
        const startLiveParams = new URLSearchParams({
            access_key: "",
            room_id: roomId,
            platform: "pc_link",
            area_v2: partitionId,
            csrf: csrf,
            csrf_token:csrf,
            build: "1234",
            version: "1.1.0",
            type: "2",
        }).toString();
        const startResponse = await axios.post(URLS.START_LIVE, startLiveParams, {
            headers: userHeaders,
        });
        if (startResponse.data.code === 0) {
            const { addr, code } = startResponse.data.data.rtmp;
            res
                .status(200)
                .json({
                    message: "Live stream started successfully!",
                    serverUrl: addr,
                    streamKey: code,
                });
        } else {
            res.status(400).json({
                error: "Failed to start live stream.",
                details: startResponse.data.message || "Unknown error.",
                biliResponse: startResponse.data,
            });
        }
    } catch (error: any) {
        console.error(
            "Error in /api/start-stream:",
            error.response?.data || error.message,
        );
        res
            .status(500)
            .json({
                error: "Internal server error",
                details: error.response?.data || error.message,
            });
    }
});

app.post("/api/stop-stream", async (req: Request, res: Response) => {
    const { SESSDATA, bili_jct, DedeUserID, buvid3, roomId } = req.body;
    if (!SESSDATA || !bili_jct || !DedeUserID || !buvid3 || !roomId) {
        return res
            .status(400)
            .json({ error: "Missing required parameters in request body." });
    }
    const cookie = `SESSDATA=${SESSDATA}; bili_jct=${bili_jct}; DedeUserID=${DedeUserID}; buvid3=${buvid3};`;
    const csrf = bili_jct;
    const userHeaders = { ...BILI_API_HEADERS, Cookie: cookie };
    const stopLiveParams = new URLSearchParams({
        room_id: roomId,
        platform: "pc_link",
        csrf_token: csrf,
        csrf,
    }).toString();
    try {
        const stopResponse = await axios.post(URLS.STOP_LIVE, stopLiveParams, {
            headers: userHeaders,
        });
        if (stopResponse.data.code === 0) {
            res.status(200).json({ message: "Live stream stopped successfully." });
        } else {
            res.status(400).json({
                error: "Failed to stop live stream.",
                details: stopResponse.data.message,
                biliResponse: stopResponse.data,
            });
        }
    } catch (error: any) {
        console.error(
            "Error in /api/stop-stream:",
            error.response?.data || error.message,
        );
        res
            .status(500)
            .json({
                error: "Internal server error",
                details: error.response?.data || error.message,
            });
    }
});

app.listen(PORT, () => {
    console.log(
        `Bilibili Live Stream API server is running on http://localhost:${PORT}`,
    );
    console.log("--- Available Endpoints ---");
    console.log("Login Flow:");
    console.log("  1. GET  /api/login/qrcode        -> Get QR code and token");
    console.log(
        "  2. GET  /api/login/poll?token=... -> Poll for login status (saves cookie on success)",
    );
    console.log("Live Stream Control:");
    console.log(
        "  - POST /api/partitions            -> Get live area partitions (body with auth)",
    );
    console.log(
        "  - POST /api/start-stream          -> Start stream (body with auth)",
    );
    console.log(
        "  - POST /api/stop-stream           -> Stop stream (body with auth)",
    );
});
