const express = require('express');
const socket = require('socket.io');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 90;

app.use(cors({
    origin: '*'
}));

const server = app.listen(PORT, () => console.log('listening to PORT', PORT));
const io = socket(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const IMDB_API_KEY = 'pk_ukg63o59ojga0st7v'; //public API key

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Opened Socket Connection', socket.id);

    socket.on('created room', (data) => {
        rooms.set(data.roomId, data.movies);
        io.to(data.roomId).emit('send content', data.movies);
    });

    socket.on('connected', (roomId) => {
        socket.join(roomId);
        console.log(`Connected to the room: ${roomId}, ${socket.id}`);
    });

    socket.on('requested content', (roomId) => {
        if (rooms.has(roomId)) {
            io.to(roomId).emit('send content', rooms.get(roomId));
        } else {
            io.to(roomId).emit('room expired');
        }
    });

    socket.on('delete item', (data) => {
        let movies = rooms.get(data.roomId);
        if (movies.length > 1) {
            movies = movies.filter(m => {
                if (m.id === data.movieId) {
                    socket.broadcast.to(data.roomId).emit('list updated', m.title);
                    return false;
                }
                return true;
            })
            io.to(data.roomId).emit('send content', movies);
        }
        rooms.set(data.roomId, movies);
    })
});

app.get('/', (req, res) => {
    res.send('success!');
});

app.get('/get-top100-imdb', (req, res) => {
    // axios.get('https://raw.githubusercontent.com/sergesarapov/movie-night-api-mock/main/250.json')
    axios.get(`https://imdb-api.com/en/API/Top250Movies/${IMDB_API_KEY}`)
        .then(({ data }) => {
            data.items.splice(100, Infinity);
            res.send(data.items);
        })
        .catch((err) => console.log(err));
});

app.get('/get-most-popular-imdb', (req, res) => {
    axios.get(`https://imdb-api.com/en/API/MostPopularMovies/${IMDB_API_KEY}`)
        .then(({ data }) => res.send(data.items))
        .catch((err) => console.log(err));
});

app.get('/get-in-theaters-imdb', (req, res) => {
    axios.get(`https://imdb-api.com/en/API/InTheaters/${IMDB_API_KEY}`)
        .then(({ data }) => res.send(data.items))
        .catch((err) => console.log(err));
});