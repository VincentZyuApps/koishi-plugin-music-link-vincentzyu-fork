#!/usr/bin/env python3
"""
生成测试歌单数据的Python脚本
用于music指令的--test参数，快速测试出图效果
"""

import json
import os
from pathlib import Path

def generate_test_songlist():
    """生成包含45首歌曲的测试歌单（模拟真实搜索结果）"""
    
    # 日语歌曲名称列表（模仿iyowa风格）
    titles_pool = [
        "地球の裏 (feat. 裏命)", "きゅうくらりん", "あだばしゃ", "1000年生きてる",
        "IMAWANOKIWA", "SLIP", "バベル", "アプリコット", "うらぼしゃ", "うわがき",
        "頬が乾くまで", "黄金数", "黄金数 (2024 ver.)", "たぶん終わり", "熱異常 (feat. 足立レイ)",
        "大女優さん", "異星にいこうね (feat. 星界)", "深夜怖い", "ももいろの鍵",
        "マーシーキリング", "SHIAWASE FOR YOU!", "リレイアウター (いよわRemix)",
        "散歩の邪魔", "ヘブンズバッグ", "パジャミィ", "みちなるひろがる", "ポプリさん",
        "水死体にもどらないで"
    ]
    
    # 歌手列表
    artists_pool = [
        "いよわ", "いよわ/初音ミク", "いよわ/可不", "いよわ/重音テト",
        "いよわ/足立レイ", "いよわ/星界", "いよわ/稲葉曇/歌愛ユキ",
        "いよわ/花隈千冬/小春六花/夏色花梨", "映画、陽だまり、卒業式",
        "初星学園/いよわ/倉本千奈/篠澤 広", "いよわ/ネギシャワーP"
    ]
    
    # 专辑列表（通常与歌名相同或简化版）
    albums_pool = [
        "地球の裏 (feat. 裏命)", "きゅうくらりん", "あだばしゃ", "1000年生きてる",
        "IMAWANOKIWA", "SLIP", "バベル", "アプリコット", "うらぼしゃ", "うわがき",
        "頬が乾くまで", "黄金数", "黄金数 (2024 ver.)", "たぶん終わり", "熱異常 (feat. 足立レイ)",
        "大女優さん", "異星にいこうね (feat. 星界)", "深夜怖い", "ももいろの鍵",
        "マーシーキリング", "SHIAWASE FOR YOU!", "リレイアウター", "散歩の邪魔",
        "ヘブンズバッグ", "パジャミィ", "みちなるひろがる", "ポプリさん",
        "水死体にもどらないで", "わたしのヘリテージ", "ねむるピンクノイズ"
    ]
    
    songs = []
    
    # 生成45首歌曲（两列布局，每列约22-23首）
    for i in range(45):
        # 交替使用网易云和QQ音乐平台
        platform = "netease" if i % 2 == 0 else "tencent"
        platform_label = "【网易云】" if platform == "netease" else "【QQ音乐】"
        
        # 选择标题、歌手、专辑
        title_idx = i % len(titles_pool)
        artist_idx = i % len(artists_pool)
        album_idx = i % len(albums_pool)
        
        name = titles_pool[title_idx]
        artist = artists_pool[artist_idx]
        album = albums_pool[album_idx]
        
        # 生成时长（2:00 - 5:00之间）
        duration_seconds = 120 + (i * 7) % 180  # 120-300秒
        duration_ms = duration_seconds * 1000
        
        # 生成ID
        if platform == "netease":
            song_id = 1800000000 + i * 1234567
            mid = None
        else:
            song_id = f"{300000000 + i * 987654}"
            mid = f"00{i:02d}ABC{i:03d}XYZ"
        
        # 生成封面URL（使用占位符）
        if platform == "netease":
            cover = f"http://p{(i % 4) + 1}.music.126.net/test_{i:02d}/109951168226094695.jpg"
        else:
            cover = f"https://y.gtimg.cn/music/photo_new/T002R800x800M00000{i:02d}KTHiH47iAe8.jpg"
        
        song = {
            "id": song_id,
            "name": "[测试]" + name,
            "artist": "[测试]" + artist,
            "album": "[测试]" + album,
            "duration": duration_ms,
            "cover": cover,
            "url": "",  # 测试时不需要真实URL
            "quality": "神秘测试音质捏",
            "size": "",
            "kbps": "",
            "platform": platform,
            "platformLabel": platform_label
        }
        
        # QQ音乐额外添加mid字段
        if platform == "tencent":
            song["mid"] = mid
        
        songs.append(song)
    
    return songs


def main():
    # 获取当前脚本所在目录
    script_dir = Path(__file__).parent.absolute()
    
    # 输出文件路径：同级的assets目录下的songlist-test.json
    # output_file = script_dir / "assets" / "songlist-test.json"
    output_file = script_dir / "songlist-test.json"
    
    # 确保assets目录存在
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # 生成测试数据
    print("🎵 正在生成测试歌单数据...")
    test_songs = generate_test_songlist()
    
    # 写入JSON文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(test_songs, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 测试数据已生成！")
    print(f"   📁 文件路径: {output_file}")
    print(f"   📊 歌曲数量: {len(test_songs)} 首")
    print(f"   🎼 平台分布: 网易云 {sum(1 for s in test_songs if s['platform'] == 'netease')} 首, "
          f"QQ音乐 {sum(1 for s in test_songs if s['platform'] == 'tencent')} 首")
    print(f"\n💡 使用方法:")
    print(f"   在Koishi中使用指令时添加 --test 参数，例如：")
    print(f"   • 落月点歌 --test")
    print(f"   • 网易点歌 --test")
    print(f"   插件将直接读取此测试数据，无需请求API")


if __name__ == "__main__":
    main()
