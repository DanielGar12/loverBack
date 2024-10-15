const express = require('express')
const mongoose = require('mongoose')

const app = express();

const bcrypt = require('bcrypt')

mongoose.connect('mongodb://localhost:27017/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

.then(() => console.log('Mongo successfully connected'))
.catch(err => console.error('error starting the server', err))

app.use(express.json())

const userSchema = new mongoose.Schema({
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true}
});

const User = mongoose.model('User', userSchema);

app.post('/users', async (req, res) => {
    const {firstName, lastName, username, password} = req.body;

    try{

        const hashPassword = await bcrypt.hash(password, 10);
        const newUser = new User ({ firstName, lastName, username, password: hashPassword});
        await newUser.save();
        res.status(201).send({ message: 'User has been successfully created', user: newUser});


    }
    catch(error){
        console.error('Registration error:', error);
        if(error.code === 11000){
            return res.status(400).send({error: 'Username already exists'});
        }
        return res.status(500).send({error: 'Failed to create the user'});

    }
})

app.post('/login', async (req, res) =>{
    const {username, password} = req.body

    try{
        const user = await User.findOne({username});
        if(!user){
            return res.status(400).send({error: 'User was not found'});
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(400).send({error: 'Invalid password'});
        }
        res.status(200).send({message: 'User login successful', user});
    }
    catch(error){
        console.error('Login error:', error)
        res.status(500).send({error: 'Failed to login'});
    }
});

app.get('/users', async (req, res) => {
    try{
        const users = await User.find()
        res.status(200).send(users)
    }
    catch(error){
        res.status(500).send({error: 'failed to fetch user: '})
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
});