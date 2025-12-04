// api/download.js (upgraded anti-bot version)
import ytdl from 'ytdl-core';

export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  let { url, format = 'video' } = req.query;

  // Clean URL: Remove bot-triggering params like si=, t=
  if (url.includes('youtu.be/')) {
    url = url.split('?')[0]; // Strip everything after ?
  } else if (url.includes('youtube.com/watch?v=')) {
    const cleanUrl = new URL(url);
    cleanUrl.searchParams.delete('si');
    cleanUrl.searchParams.delete('t');
    url = cleanUrl.toString();
  }

  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    // Fake browser headers to dodge CAPTCHA
    ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
      },
    }).then(async (info) => {
      let formatOptions = { quality: 'highest', filter: 'audioandvideo' };

      if (format === 'audio') {
        formatOptions = { quality: 'highestaudio', filter: 'audioonly' };
      }

      const chosenFormat = ytdl.chooseFormat(info.formats, formatOptions);
      const directUrl = chosenFormat?.url || info.videoDetails.video_url;

      res.status(200).json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || info.videoDetails.thumbnails[0].url,
        download_url: directUrl,
        duration: info.videoDetails.lengthSeconds,
        expires_in: "6 hours (YouTube signed URL)"
      });
    }).catch((err) => {
      // Retry once on CAPTCHA error
      if (err.message.includes('sign in') || err.message.includes('bot')) {
        setTimeout(() => {
          ytdl.getInfo(url, { requestOptions: { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } } })
            .then((info) => { /* same response logic as above */ res.status(200).json({ /* ... */ }); })
            .catch(() => res.status(500).json({ error: "Retry failed - YouTube blocking detected. Try a different video." }));
        }, 2000); // 2-sec delay
      } else {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
}
