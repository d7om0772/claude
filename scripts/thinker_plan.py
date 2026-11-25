#!/usr/bin/env python3
"""thinker_plan.py — خطة المفكر لليوم: كلمات تيك توك وهاشتاقات إنستقرام بالتدوير (ثابتة لنفس التاريخ)،
مدخلات Apify جاهزة، آخر ملف بحث، ونطاق التقويم اللي تنحط فيه الفكرة.

  python3 scripts/thinker_plan.py [--date YYYY-MM-DD]
"""
import argparse, datetime, glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
TZ = datetime.timezone(datetime.timedelta(hours=3))


def pick(items, k, day):
    n = len(items); start = (day.toordinal() * k) % n
    return [items[(start + i) % n] for i in range(k)]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--date"); a = ap.parse_args()
    day = datetime.date.fromisoformat(a.date) if a.date else datetime.datetime.now(TZ).date()
    t = CFG["thinker"]; tk, ig = t["tiktok"], t["instagram"]
    kws, tags = pick(tk["keywords"], tk["keywords_per_day"], day), pick(ig["hashtags"], ig["hashtags_per_day"], day)
    prev = sorted(p for p in glob.glob(os.path.join(ROOT, "content", "ideas", "research", "*.md")) if os.path.basename(p) < f"{day}.md")
    print(json.dumps({
        "date": day.isoformat(), "series": t["series"],
        "tiktok_calls": [{"tool": "xtdata--tiktok-scraper", "input": {"type": "SEARCH", "keywords": [k], "region": tk["region"],
                          "publishTime": tk["publishTime"], "sortType": tk["sortType"], "maxItems": tk["maxItems"], "waitSecs": 45}} for k in kws],
        "tiktok_fields": "desc,create_time,share_url,video.duration,author.unique_id,author.follower_count,statistics.play_count,statistics.digg_count,statistics.comment_count,statistics.share_count,statistics.collect_count",
        "instagram_call": {"tool": "call-actor", "actor": ig["actor"], "input": {"directUrls": [f"https://www.instagram.com/explore/tags/{h}/" for h in tags],
                           "resultsType": ig["resultsType"], "resultsLimit": ig["resultsLimit"], "onlyPostsNewerThan": ig["onlyPostsNewerThan"]},
                           "callOptions": {"maxTotalChargeUsd": ig["max_usd"]}, "waitSecs": 45},
        "instagram_fields": "url,caption,ownerUsername,timestamp,productType,videoDuration,videoPlayCount,videoViewCount,likesCount,commentsCount,hashtags",
        "research_file": f"content/ideas/research/{day}.md",
        "previous_research": os.path.relpath(prev[-1], ROOT) if prev else None,
        "calendar_window": [(day + datetime.timedelta(days=1)).isoformat(), (day + datetime.timedelta(days=7)).isoformat()],
    }, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
