
const express = require('express');
const http = require('http');
const axios = require('axios');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const openai = require('openai');
const Message = require('./models/Message')
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const cors = require('cors');

app.use(express.json());
app.use(cors());
  

// Start listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

io.on('connection', (socket) => {
    console.log('User connected');
  
    // Handle socket events
    socket.on('message', (data) => {
      console.log('Message received:', data);
  
      // Broadcast the message to all connected clients
      io.emit('message', { text: data.text, timestamp: new Date() });
  
      // Save the message to MongoDB (you need to implement this part)
      saveMessageToMongoDB(data.text);
    });
  
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

// database connection

mongoose.connect('mongodb+srv://Ashutosh_04:v526FKdmZUKwwKsv@cluster0.rrxicof.mongodb.net/social?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  const db = mongoose.connection;
  
  db.on('error', console.error.bind(console, 'MongoDB connection error:'));
  db.once('open', () => {
    console.log('Connected to MongoDB');
  });

// handling requests from openai and posting data to database

const openaiClient = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY});

app.post('/openai', async (req, res) => {
  const { message } = req.body;

  try {
    // Make a request to OpenAI API
    const response = await openaiClient.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: message,
      max_tokens: 150,
    });
   try {
    user = "user";
    await saveMessageToMongoDB(message,user);
     console.log("message saved");
   } catch (error) {
    console.log(error.message);
   }
   try {
    user = "BOT";
    botmsg = response.choices[0].text.trim();
    await saveMessageToMongoDB(botmsg,user);
     console.log("Bot message saved");
   } catch (error) {
      console.log(error.message);
   }
    // Send the response back to the client
    res.json({ reply: response.choices[0].text.trim() });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getMessages', async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (error) {
    console.error('Error retrieving messages:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

async function saveMessageToMongoDB(text,user) {
    const message = new Message({ text , user });
    try {
      const saved = await message.save();
    } catch (error) {
      console.log(error.message);
    }
  }
