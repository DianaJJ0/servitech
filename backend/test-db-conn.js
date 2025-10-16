require('dotenv').config();
const mongoose = require('mongoose');

(async function () {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not defined');
    process.exit(1);
  }

  console.log('Using MONGO_URI:', uri.replace(/:(.*)@/, ':*****@'));
  console.log('Attempting mongoose.connect with serverSelectionTimeoutMS=5000');

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('Connected. readyState=', mongoose.connection.readyState);

    // Try a quick find on usuarios collection (schema-free)
    const Usuario = mongoose.model('Usuario', new mongoose.Schema({}, { strict: false }), 'usuarios');
    const u = await Usuario.findOne().lean().exec();
    console.log('findOne result:', u ? 'found a document' : 'no documents');

    // Try inserting into logs collection (schema-free)
    const Log = mongoose.model('Log', new mongoose.Schema({}, { strict: false }), 'logs');
    const logRes = await Log.insertOne ? await Log.insertOne({ test: true, ts: new Date() }) : await Log.create({ test: true, ts: new Date() });
    console.log('log insert result:', logRes && (logRes.insertedId || logRes._id) ? 'ok' : 'unknown');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Connection/test error:');
    console.error(err && err.stack ? err.stack : err);
    try {
      console.error('Mongoose readyState:', mongoose.connection.readyState);
    } catch (e) {}
    process.exit(2);
  }
})();
