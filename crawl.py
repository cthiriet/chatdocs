import pinecone
from langchain.vectorstores import Pinecone
from langchain.text_splitter import NLTKTextSplitter
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.docstore.document import Document
from langchain import OpenAI
import tiktoken
from dotenv import load_dotenv
import requests
import re
import urllib.request
from bs4 import BeautifulSoup
from collections import deque
from html.parser import HTMLParser
from urllib.parse import urlparse
import os
import argparse

# Load the environment variables from the .env file
load_dotenv()

llm = OpenAI(temperature=0)
embeddings = OpenAIEmbeddings()

# Define the tokenizer
enc = tiktoken.get_encoding("gpt2")

# initialize pinecone
pinecone.init(api_key=os.getenv("PINECONE_API_KEY"),
              environment=os.getenv("PINECONE_ENV"))

text_splitter = NLTKTextSplitter.from_tiktoken_encoder(
    chunk_size=500, chunk_overlap=100)

# Regex pattern to match a URL
HTTP_URL_PATTERN = r'^http[s]*://.+'

parser = argparse.ArgumentParser()
parser.add_argument('--domain', help='The domain to crawl',
                    default='stripe.com')
parser.add_argument('--url', help='The base URL to crawl',
                    default='https://stripe.com/docs/')
parser.add_argument(
    '--excludes', help='The URLs to exclude from the crawl', required=False)
args = parser.parse_args()

# Define root domain to crawl
domain = args.domain
base_url = args.url
excludes = args.excludes.split(",")

parsed_full_url = urlparse(base_url)

# reconstruct full url
base_url = parsed_full_url.scheme + "://" + \
    parsed_full_url.netloc + parsed_full_url.path
full_url_path = parsed_full_url.path


# recontruct path from object
def get_url_from_object(parsed_url):
    return parsed_url.scheme + "://" + parsed_url.netloc + parsed_url.path


def sanitize_text(text):
    # Remove whitespace from the beginning and end of the text
    text = text.strip()

    # Remove all newlines from the text
    text = text.replace("\n", " ")

    # Remove all extra spaces from the text
    text = " ".join(text.split())

    # Remove all special characters from the text except punctuation but keep numbers
    text = "".join([c for c in text if c.isalnum()
                   or c.isspace() or c in ".,?!:;'-"])

    # Return the sanitized text
    return text


# Create a class to parse the HTML and get the hyperlinks
class HyperlinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        # Create a list to store the hyperlinks
        self.hyperlinks = []

    # Override the HTMLParser's handle_starttag method to get the hyperlinks
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)

        # If the tag is an anchor tag and it has an href attribute, add the href attribute to the list of hyperlinks
        if tag == "a" and "href" in attrs:
            self.hyperlinks.append(attrs["href"])


# Function to get the hyperlinks from a URL
def get_hyperlinks(url):

    # Try to open the URL and read the HTML
    try:
        # Open the URL and read the HTML
        with urllib.request.urlopen(url) as response:

            # If the response is not HTML, return an empty list
            if not response.info().get('Content-Type').startswith("text/html"):
                return []

            # Decode the HTML
            html = response.read().decode('utf-8')
    except Exception as e:
        print(e)
        return []

    # Create the HTML Parser and then Parse the HTML to get hyperlinks
    parser = HyperlinkParser()
    parser.feed(html)

    return parser.hyperlinks


# Function to get the hyperlinks from a URL that are within the same domain
def get_domain_hyperlinks(local_domain, url):
    clean_links = []
    for link in set(get_hyperlinks(url)):
        clean_link = None

        # If the link is a URL, check if it is within the same domain
        if re.search(HTTP_URL_PATTERN, link):
            # Parse the URL and check if the domain is the same
            url_obj = urlparse(link)
            if url_obj.netloc == local_domain:
                clean_link = get_url_from_object(url_obj)

        # If the link is not a URL, check if it is a relative link
        else:
            if link.startswith("/"):
                link = link[1:]
            elif link.startswith("#") or link.startswith("mailto:"):
                continue

            clean_link = "https://" + local_domain + "/" + link

        if clean_link is not None:
            # parse the link
            clean_link = get_url_from_object(urlparse(clean_link))

            # check if the link is in the excludes list and set it to None if it is
            for exclude in excludes:
                if exclude in clean_link:
                    clean_link = None
                    break

            if clean_link is not None and base_url not in clean_link:
                clean_link = None

        if clean_link is not None:
            if clean_link.endswith("/"):
                clean_link = clean_link[:-1]
            clean_links.append(clean_link)

    # Return the list of hyperlinks that are within the same domain
    return list(set(clean_links))


def crawl(url):
    # Parse the URL and get the domain
    local_domain = urlparse(url).netloc

    # Create a queue to store the URLs to crawl
    queue = deque([url])

    # Create a set to store the URLs that have already been seen (no duplicates)
    seen = set([url])

    # Create a directory to store the text files
    if not os.path.exists("text/"):
        os.mkdir("text/")

    if not os.path.exists("text/"+local_domain+"/"):
        os.mkdir("text/" + local_domain + "/")

    # While the queue is not empty, continue crawling
    while queue:

        # Get the next URL from the queue
        url = queue.pop()
        print(url)  # for debugging and to see the progress

        # Save text from the url to a <url>.txt file
        with open('text/'+local_domain+'/'+url[8:].replace("/", "_") + ".txt", "w") as f:

            # Get the text from the URL using BeautifulSoup
            soup = BeautifulSoup(requests.get(url).text, "html.parser")

            # Get the text but remove the tags
            text = soup.get_text()

            # If the crawler gets to a page that requires JavaScript, it will stop the crawl
            if ("You need to enable JavaScript to run this app." in text):
                print("Unable to parse page " + url +
                      " due to JavaScript being required")

            text = sanitize_text(text)

            text = f"{url}|{text}"

            # Otherwise, write the text to the file in the text directory
            f.write(text)

        # Get the hyperlinks from the URL and add them to the queue
        for link in get_domain_hyperlinks(local_domain, url):
            if link not in seen:
                queue.append(link)
                seen.add(link)


if __name__ == '__main__':
    print("Crawling...")
    crawl(base_url)

    # Create a list to store the text files
    sources = []

    # Get all the text files in the text directory
    for file in os.listdir("text/" + domain + "/"):

        # Open the file and read the text
        with open("text/" + domain + "/" + file, "r") as f:
            text = f.read()
            url = text.split("|")[0]
            text = text.split("|")[1]
            sources.append((url, text))

    print("Creating chunks from the webpages...")
    docs = []
    for (url, source) in sources:
        texts = text_splitter.split_text(source)
        docs.extend(
            [Document(page_content=t, metadata={"url": url}) for t in texts])

    print("Saving sources in the Pinecone index...")
    index_name = os.getenv("PINECONE_INDEX_NAME")
    namespace = os.getenv("PINECONE_INDEX_NAME")

    docsearch = Pinecone.from_documents(
        docs, embeddings, index_name=index_name, namespace=namespace)

    print("Done! ✅")
