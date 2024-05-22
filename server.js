const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { google } = require('googleapis');

const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });

// Serve index.html when accessing the root URL
app.use(express.static('public'));
app.post('/upload', upload.fields([{ name: 'jsonFile', maxCount: 1 }, { name: 'csvFile', maxCount: 1 }]), async (req, res) => {
    try {
        // Read JSON file
        const jsonFile = req.files['jsonFile'][0];
        const jsonContent = fs.readFileSync(jsonFile.path);
        const credentials = JSON.parse(jsonContent);

        // Authenticate with Google Indexing API
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/indexing']
        });

        const indexing = google.indexing({ version: 'v3', auth });

        // Read URLs from CSV file
        const csvFile = req.files['csvFile'][0];
        const urls = [];
        fs.createReadStream(csvFile.path)
            .pipe(csv())
            .on('data', (row) => {
                if (row.URL) urls.push(row.URL);
            })
            .on('end', () => {
                urls.forEach(async (url) => {
                    const requestBody = {
                        url: url.trim(),
                        type: 'URL_UPDATED'
                    };

                    try {
                        const response = await indexing.urlNotifications.publish({ requestBody });
                        const result = response.data;
                        console.log('Indexed URL:', result.urlNotificationMetadata.url);
                    } catch (error) {
                        console.error('Error indexing URL:', error.message);
                    }
                });
            });

        res.send('Files uploaded and URLs are being indexed.');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing the files.');
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
