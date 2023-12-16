const express = require('express');
const router = express.Router();
const db = require('./db');
const Joi = require('joi');

// Custom URL validation regex
const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;

// Define Joi schema for sharelink information
const shareLinkSchema = Joi.object({
    link: Joi.string().pattern(urlRegex).message('Invalid URL').required(),
});

// Create a sharelink
router.post('/settings/add-sharelink', (req, res) => {
    const { link } = req.body;

    // Validate the data against the schema
    const validationResult = shareLinkSchema.validate({ link }, { abortEarly: false });

    // Check for validation errors
    if (validationResult.error) {
        const errors = validationResult.error.details.map((err) => err.message);
        return res.status(400).send({ errors: errors });
    }

    const insertSql = 'INSERT INTO bxd0zyd7tcfvza0d.sharelink (link) VALUES (?)';
    db.query(insertSql, [link], (err, result) => {
        if (err) {
            console.error('Error creating sharelink:', err);
            return res.status(500).send({ error: 'Internal Server Error' });
        }
        res.status(201).send({ message: 'Sharelink created successfully', sharelinkId: result.insertId });
    });
});

// Get all sharelinks
router.get('/settings/get-sharelink', (req, res) => {
    const selectSql = 'SELECT * FROM bxd0zyd7tcfvza0d.sharelink';
    db.query(selectSql, (err, results) => {
        if (err) {
            console.error('Error fetching sharelinks:', err);
            return res.status(500).send({ error: 'Internal Server Error' });
        }
        res.status(200).send({ data: results });
    });
});

// Update a sharelink
router.patch('/settings/update-sharelink/:sharelinkId', (req, res) => {
    const { sharelinkId } = req.params;
    const { link } = req.body;

    // Validate the data against the schema
    const validationResult = shareLinkSchema.validate({ link }, { abortEarly: false });

    // Check for validation errors
    if (validationResult.error) {
        const errors = validationResult.error.details.map((err) => err.message);
        return res.status(400).send({ errors: errors });
    }

    // Check if the sharelink with the specified ID exists
    const checkSharelinkSql = 'SELECT * FROM bxd0zyd7tcfvza0d.sharelink WHERE id=?';
    db.query(checkSharelinkSql, [sharelinkId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking sharelink:', checkErr);
            return res.status(500).send({ error: 'Internal Server Error' });
        }

        // If no sharelink found, return a "Not Found" response
        if (checkResults.length === 0) {
            return res.status(404).send({ error: 'No sharelink found' });
        }

        // Update the sharelink if it exists
        const updateSql = 'UPDATE bxd0zyd7tcfvza0d.sharelink SET link=? WHERE id=?';
        db.query(updateSql, [link, sharelinkId], (updateErr, result) => {
            if (updateErr) {
                console.error('Error updating sharelink:', updateErr);
                return res.status(500).send({ error: 'Internal Server Error' });
            }
            res.status(200).send({ message: 'Sharelink updated successfully' });
        });
    });
});

// Delete a sharelink
router.delete('/settings/delete-sharelink/:sharelinkId', (req, res) => {
    const { sharelinkId } = req.params;

    // Check if the sharelink with the specified ID exists
    const checkSharelinkSql = 'SELECT * FROM bxd0zyd7tcfvza0d.sharelink WHERE id=?';
    db.query(checkSharelinkSql, [sharelinkId], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking sharelink:', checkErr);
            return res.status(500).send({ error: 'Internal Server Error' });
        }

        // If no sharelink found, return a "Not Found" response
        if (checkResults.length === 0) {
            return res.status(404).send({ error: 'No sharelink found' });
        }

        // Delete the sharelink if it exists
        const deleteSql = 'DELETE FROM bxd0zyd7tcfvza0d.sharelink WHERE id=?';
        db.query(deleteSql, [sharelinkId], (deleteErr, result) => {
            if (deleteErr) {
                console.error('Error deleting sharelink:', deleteErr);
                return res.status(500).send({ error: 'Internal Server Error' });
            }
            res.status(200).send({ message: 'Sharelink deleted successfully' });
        });
    });
});

module.exports = router;
