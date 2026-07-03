import urllib.request
import re

html = urllib.request.urlopen('https://www.youtube.com/results?search_query=live+traffic+camera&sp=EgJAAQ%253D%253D').read().decode()
video_ids = re.findall(r'\"videoId\":\"(.*?)\"', html)

print(list(set(video_ids))[:10])
