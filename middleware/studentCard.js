const QRCode = require('qrcode');

const displayID = async (req, res, next) => {
    const userEmail = req.session.email;
    try {
        const qrUrl = await QRCode.toDataURL(userEmail);
        res.locals.userData = {
            displayname: req.session.name,
            displayemail: req.session.email,
            displaymajor: req.session.major,
            displayimage: req.session.image,
            qrUrl: qrUrl
        };
        next(); // 다음 미들웨어로 이동
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

module.exports = { displayID };




