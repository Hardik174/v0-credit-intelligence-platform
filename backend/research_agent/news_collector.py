import feedparser
from urllib.parse import quote
from newspaper import Article


def collect_news(entity):

    query = quote(entity)

    rss_url = f"https://news.google.com/rss/search?q={query}"

    feed = feedparser.parse(rss_url)

    articles = []

    for entry in feed.entries[:5]:
        try:
            article = Article(entry.link)
            article.download()
            article.parse()

            articles.append({
                "title": entry.title,
                "source": entry.source.title if "source" in entry else "",
                "summary": article.text[:500],
                "url": entry.link
            })
        except:
            continue

    return articles