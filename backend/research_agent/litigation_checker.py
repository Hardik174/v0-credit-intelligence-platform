import feedparser
from urllib.parse import quote


def check_litigation(entity):

    query = quote(f"{entity} lawsuit OR fraud OR investigation OR NCLT OR bankruptcy India")

    url = f"https://news.google.com/rss/search?q={query}"

    feed = feedparser.parse(url)

    cases = []

    for entry in feed.entries[:5]:

        cases.append({
            "title": entry.title,
            "source": entry.source.title if "source" in entry else "",
            "link": entry.link
        })

    return cases