import httpx
import logging
from typing import List, Optional, Tuple
import feedparser
from pydantic import BaseModel
import asyncio

# Set up
class Video(BaseModel):
    id: str
    title: str
    url: str
    published: str
    thumbnail: Optional[str] = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger(__name__)

request_lock = asyncio.Lock()

async def feed_fetcher(
    rss_id: str,
    video_id: Optional[str] = None
) -> Optional[Tuple[List[str], List[Video], str, str, str]]:
    """
    Fetches and parses a YouTube channel's RSS feed.
    Returns: (recent_timestamps, new_videos, latest_video_id, channel_name, channel_url) or None
    """
    async with request_lock:
        feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={rss_id}"
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(feed_url)
                response.raise_for_status()
                log.info("Fetched feed for channel %s", rss_id)
                xml = response.text
        except httpx.HTTPStatusError as err:
            log.error("HTTP error fetching feed %s: %s", rss_id, err)
            return None
        except httpx.RequestError as err:
            log.error("Network error fetching feed %s: %s", rss_id, err)
            return None

        feed = feedparser.parse(xml)
        if not feed.entries:
            log.info("No entries in feed for channel %s", rss_id)
            return None

        videos: List[Video] = []
        for entry in feed.entries:
            # Extract video ID (format: yt:video:VIDEO_ID)
            vid = entry.get("id", "").split(":")[-1]
            if not vid:
                continue
            # Title is in entry.title
            title = entry.get("title", "No title")
            # Published date
            published = entry.get("published", "")
            # Thumbnail from media:thumbnail (highest res first)
            thumbnail = None
            if "media_thumbnail" in entry and entry.media_thumbnail:
                thumbnail = entry.media_thumbnail[0]["url"]
            # Canonical URL
            url = entry.get("link") or f"https://www.youtube.com/watch?v={vid}"
            videos.append(Video(
                id=vid,
                title=title,
                url=url,
                published=published,
                thumbnail=thumbnail
            ))

        if not videos:
            log.info("No valid videos parsed for channel %s", rss_id)
            return None

        # Sort newest first by published date
        videos.sort(key=lambda x: x.published, reverse=True)

        latest_video_id = videos[0].id

        channel_name = feed.feed.get("title", "Unknown Channel") if feed.feed else "Unknown Channel"

        # ────────────────────────────────────────────────
        # Added: extract channel URL (author_uri / link)
        # ────────────────────────────────────────────────
        channel_url = "Unknown URL"
        if feed.feed:
            # Most reliable: author_uri when present
            if "author_uri" in feed.feed:
                channel_url = feed.feed.author_uri
            # Funcategorizedback: look for link with rel="alternate" or first link
            elif "link" in feed.feed and isinstance(feed.feed.link, str):
                channel_url = feed.feed.link
            elif "links" in feed.feed and feed.feed.links:
                for link in feed.feed.links:
                    if link.get("rel") == "alternate" and link.get("href"):
                        channel_url = link["href"]
                        break
                else:
                    channel_url = feed.feed.links[0].get("href", "Unknown URL")

        # Determine which videos are new
        if video_id == latest_video_id:
            log.info("No new video (latest already known: %s)", latest_video_id)
            return "old"

        elif video_id is None:
            # First run: return only the latest video
            new_videos = [videos[0]]
            log.info("First run: returning latest video for %s", rss_id)

        else:
            # Find index of the last known video
            try:
                idx = next(i for i, v in enumerate(videos) if v.id == video_id)
                new_videos = videos[:idx]  # uncategorized videos newer than known one
                log.info("Found %d new video(s) since %s", len(new_videos), video_id)
            except StopIteration:
                # Known video not in feed anymore (e.g. old), funcategorized back to latest
                new_videos = [videos[0]]
                log.warning("Previously seen video %s not in feed, returning latest", video_id)

        # Return up to 20 recent published timestamps (for rate limiting / health checks)
        recent_timestamps = [v.published for v in videos[:20]]

        # Polite delay to avoid hammering YouTube
        await asyncio.sleep(10)

        return recent_timestamps, new_videos, latest_video_id, channel_name, channel_url
"""
Status: works
Edge case Introduced: the return being none of whatever module uses it
#---------------------------------------------------------
Operation:
- Does guarantee sorting
- Handles Edge cases:
- Http status
- Request
- if feed not found
- if no valid video after parsing
- Operation:
- If latest == video id -> abandon the process
- If video id not given -> Only latest
- if video id not found -> only latest
- if finds the video id -> return the missed updates
#------------------------------------------------
Returns:
    - ts, result, latest
    - result contains published,id,thumbnail,url
#-------------------
Imported by
-ts_proc.py
-Organize.py
"""

# Example runner
async def main():
    rss_id = ""
    last_video_id = ""
    try:
        ts, result, latest, channel_name = await feed_fetcher(rss_id, last_video_id)
        if result is None:
            print("No new videos, feed empty, or matched—nothing to process. \n")
            return
        print(f"Latest 8 published timestamps: {list(ts)} \n")
        print(f"New/missed videos found: {len(result)} \n")
        print(f"latest videod is {latest} \n")
        for video in result:
            print(f"- Video ID: {video.id}")
            print(f" Published: {video.published}")
        print(video.thumbnail)
        print(channel_name)
    except Exception as e:
        log.error(f"Error in main: {e}")
if __name__ == "__main__":
    asyncio.run(main())
