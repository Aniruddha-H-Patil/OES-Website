async function uploadToImgBB(base64Image) {
    if (!process.env.IMGBB_API_KEY) return base64Image;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const body = new URLSearchParams();
        body.append('image', base64Image.replace(/^data:image\/\w+;base64,/, ''));

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
            method: 'POST',
            body: body,
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        return data.success ? data.data.url : base64Image;
    } catch (err) {
        console.error("ImgBB Upload Failed or Timed Out, fallback used:", err.message);
        return base64Image;
    }
}

module.exports = {
    uploadToImgBB
};