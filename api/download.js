// api/download.js
import ytDl from 'ytdl-core';
import ytdl from '@distube/ytdl-core'; // newer fork if needed

export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { url, format = 'video' } = req.query;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
    const info = await ytdl.getInfo(url);
    let formatOptions = { quality: 'highest', filter: 'audioandvideo' };

    if (format === 'audio') {
      formatOptions = { quality: 'highestaudio', filter: 'audioonly' };
    }

    const stream = ytdl.downloadFromInfo(info, formatOptions);
    const directUrl = stream.formats.find(f => f.url)?.url || stream.url;

    res.status(200).json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0].url,
      download_url: directUrl,
      expires_in: "6 hours (YouTube signed URL)"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
