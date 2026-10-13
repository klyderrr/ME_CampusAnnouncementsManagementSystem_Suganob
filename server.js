const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

const loadAnnouncements = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

let announcements = loadAnnouncements();
let nextId = announcements.reduce((highestId, announcement) => Math.max(highestId, announcement.id), 0) + 1;

const saveAnnouncements = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(announcements, null, 2) + '\n');
};

const getStatus = (expiryDateStr) => {
    const today = new Date();
    //set date to midnight
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    return today <= expiry ? 'ACTIVE' : 'EXPIRED';
};

//get announcments
app.get('/api/announcements', (req, res) => {
    const formatAnnouncements = announcements.map(ann => ({
        ...ann,
        status: getStatus(ann.expiry_date)
    }));
    res.status(200).json(formatAnnouncements);
});

//get announcements per id
app.get('/api/announcements/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const announcement = announcements.find(ann => ann.id === id);

    if (!announcement) {
        return res.status(404).json({ error: `${id} not found` });
    }

    res.status(200).json({
        ...announcement,
        status: getStatus(announcement.expiry_date)
    });
});

//post announcements
app.post('/api/announcements', (req, res) => {
    const { title, message, date_posted, expiry_date, category } = req.body;

    if (!title || !message || !date_posted || !expiry_date || !category) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const postedDate = new Date(date_posted);
    const expiredDate = new Date(expiry_date);

    if (expiredDate < postedDate) {
        return res.status(400).json({ 
            error: 'The expiry date cannot be earlier than the posting date' 
        });
    }

    const newAnnouncement = {
        id: nextId++,
        title,
        message,
        date_posted,
        expiry_date,
        category
    };

    announcements.push(newAnnouncement);
    saveAnnouncements();

    res.status(201).json({
        message: 'announcement created',
        data: {
            ...newAnnouncement,
            status: getStatus(newAnnouncement.expiry_date)
        }
    });
});

//delete annoucements
app.delete('/api/announcements/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const index = announcements.findIndex(ann => ann.id === id);

    if (index === -1) {
        return res.status(404).json({ error: `Announcement not found` });
    }

    const deletedAnnouncement = announcements.splice(index, 1);
    saveAnnouncements();

    res.status(200).json({ 
        message: `Announcement deleted`,
        deleted: deletedAnnouncement[0]
    });
});

//server start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

