exports.up = function (db, callback) {
  console.log('Start migration');
  // Add a new column 'emoji' to the 'notifications' table
  db.addColumn('notifications', 'emoji', { type: 'string', defaultValue: null }, function (err) {
    if (err) {
      console.error('Error adding column:', err);
      return callback(err);
    }

    console.log('Column added successfully');
    return callback();
  });
};


exports.down = function (db, callback) {
  // Remove the 'emoji' column from the 'notifications' table
  db.removeColumn('notifications', 'emoji', function (err) {
    if (err) return callback(err);
  });
};
