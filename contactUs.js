const express = require('express');
const router = express.Router();
const db = require('./db');
const Joi = require('joi');

// Define Joi schema for contact information
const contactSchema = Joi.object({
    contact: Joi.alternatives(
        Joi.string().pattern(/^[0-9]{10}$/),
        Joi.string().email().regex(/^[^\s@]+@gmail\.com$/)
    ),
    share: Joi.object({
        android: Joi.string().uri(),
        ios: Joi.string().uri()
    }),
    rating: Joi.object({
        android: Joi.string().uri(),
        ios: Joi.string().uri()
    })
});

// Create a contact
router.post('/settings/add-contact', (req, res) => {
    const { contact, share, rating } = req.body;

    // Check if there is already a contact in the table
    const checkExistingSql = 'SELECT COUNT(*) AS count FROM contact';
    db.query(checkExistingSql, (checkErr, checkResult) => {
        if (checkErr) {
            console.error('Error checking existing contact:', checkErr);
            return res.status(500).send({ error: 'Internal Server Error' });
        }

        const existingCount = checkResult[0].count;

        if (existingCount > 0) {
            return res.status(400).send({ error: 'Only one data allowed. Try to update the exisiting one!!' });
        }

        // Validate the data against the schema
        const validationResult = contactSchema.validate({ contact, share, rating }, { abortEarly: false });

        // Check for validation errors
        if (validationResult.error) {
            const errors = validationResult.error.details.map((err) => err.message);
            return res.status(400).send({ errors: errors });
        }

        // Insert the new contact
        const insertSql = 'INSERT INTO contact (contact, share, rating) VALUES (?, ?, ?)';
        db.query(insertSql, [contact, JSON.stringify(share), JSON.stringify(rating)], (err, result) => {
            if (err) {
                console.error('Error creating contact:', err);
                return res.status(500).send({ error: 'Internal Server Error' });
            }
            res.status(200).send({ message: 'Contact created successfully', contactId: result.insertId });
        });
    });
});


// Get all contacts
router.get('/settings/get-contact', (req, res) => {
    const selectSql = 'SELECT * FROM contact';  
    db.query(selectSql, (err, results) => {
        if (err) {
            console.error('Error fetching contacts:', err);
            return res.status(500).send({ error: 'Internal Server Error' });
        }
        res.status(200).send({ data: results[0] });
    });
});

// Update a contact
router.patch('/settings/update-contact/:id', (req, res) => {
    const { id } = req.params;
    const { contact, share, rating } = req.body;

    // Validate the data against the schema
    const validationResult = contactSchema.validate({ contact }, { abortEarly: false });

    // Check for validation errors
    if (validationResult.error) {
        const errors = validationResult.error.details.map((err) => err.message);
        return res.status(400).send({ errors: errors });
    }

    // Check if the contact with the specified ID exists
    const checkContactSql = 'SELECT * FROM contact WHERE id=?';
    db.query(checkContactSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking contact:', checkErr);
            return res.status(500).send({ error: 'Internal Server Error' });
        }

        // If no contact found, return a "Not Found" response
        if (checkResults.length === 0) {
            return res.status(404).send({ error: 'No contact found' });
        }

        // Update the contact if it exists
        const updateSql = 'UPDATE contact SET contact=?, share=?, rating=? WHERE id=?';
        db.query(updateSql, [contact, JSON.stringify(share), JSON.stringify(rating), id], (updateErr, result) => {
            if (updateErr) {
                console.error('Error updating contact:', updateErr);
                return res.status(500).send({ error: 'Internal Server Error' });
            }
            res.status(200).send({ message: 'Contact updated successfully' });
        });
    });
});



// Delete a contact
router.delete('/settings/delete-contact/:id', (req, res) => {
    const { id } = req.params;

    // Check if the contact with the specified ID exists
    const checkContactSql = 'SELECT * FROM contact WHERE id=?';
    db.query(checkContactSql, [id], (checkErr, checkResults) => {
        if (checkErr) {
            console.error('Error checking contact:', checkErr);
            return res.status(500).send({ error: 'Internal Server Error' });
        }

        // If no contact found, return a "Not Found" response
        if (checkResults.length === 0) {
            return res.status(404).send({ error: 'No contact found' });
        }

        // Delete the contact if it exists
        const deleteSql = 'DELETE FROM contact WHERE id=?';
        db.query(deleteSql, [id], (deleteErr, result) => {
            if (deleteErr) {
                console.error('Error deleting contact:', deleteErr);
                return res.status(500).send({ error: 'Internal Server Error' });
            }
            res.status(200).send({ message: 'Contact deleted successfully' });
        });
    });
});


module.exports = router;