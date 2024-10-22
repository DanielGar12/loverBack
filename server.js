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

const pairSchema = new mongoose.Schema({
    user1: {type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    user2: {type: mongoose.Schema.Types.ObjectId, ref:'User', required: true},
    creation: { type: Date, default: Date.now },
});

const inviteSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Fixed typo here
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Couple = mongoose.model('Couple', pairSchema);
const Invite = mongoose.model('Invite', inviteSchema);



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

app.post('/couple/connect', async (req, res) => {
    const { requesterUsername, partnerUsername } = req.body;

    try {
        // Find both users
        const requester = await User.findOne({ username: requesterUsername });
        const partner = await User.findOne({ username: partnerUsername });

        if (!requester || !partner) {
            return res.status(404).send({ error: 'One or both users not found' });
        }

        // Check if they are already connected
        const existingCouple = await Couple.findOne({
            $or: [
                { user1: requester._id, user2: partner._id },
                { user1: partner._id, user2: requester._id },
            ],
        });

        if (existingCouple) {
            return res.status(400).send({ error: 'Users are already connected' });
        }

        // Create a new couple connection
        const newCouple = new Couple({ user1: requester._id, user2: partner._id });
        await newCouple.save();

        res.status(201).send({ message: 'Users successfully connected', couple: newCouple });
    } catch (error) {
        console.error('Connection error:', error);
        res.status(500).send({ error: 'Failed to connect users' });
    }
});
app.post('/invite/send', async (req, res) => {
    const { senderUsername, receiverUsername } = req.body;
    console.log('Request body:', req.body);

    try {
        const sender = await User.findOne({ username: senderUsername });
        const receiver = await User.findOne({ username: receiverUsername });

        if (!sender || !receiver) {
            return res.status(404).send({ error: 'One or both users not found' });
        }

        // Check if an invite already exists
        const existingInvite = await Invite.findOne({ sender: sender._id, receiver: receiver._id });

        if (existingInvite) {
            return res.status(400).send({ error: 'Invite already sent' });
        }

        // Create a new invite
        const invite = new Invite({ sender: sender._id, receiver: receiver._id });
        await invite.save();

        res.status(201).send({ message: 'Invite sent', invite });
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).send({ error: 'Failed to send invite' });
    }
});
app.post('/invite/respond', async (req, res) => {
    const { inviteId, status } = req.body;

    try {
        const invite = await Invite.findById(inviteId);

        if (!invite) {
            return res.status(404).send({ error: 'Invite not found' });
        }

       
        invite.status = status;
        await invite.save();

        if (status === 'accepted') {
            const couple = new Couple({ user1: invite.sender, user2: invite.receiver });
            await couple.save();
            res.status(200).send({ message: 'Invite accepted, users connected', couple });
        } else {
            res.status(200).send({ message: 'Invite rejected' });
        }
    } catch (error) {
        console.error('Error responding to invite:', error);
        res.status(500).send({ error: 'Failed to respond to invite' });
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

app.get('/couple/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        
        const couple = await Couple.findOne({
            $or: [{ user1: user._id }, { user2: user._id }],
        }).populate('user1 user2', 'username firstName lastName');

        if (!couple) {
            return res.status(404).send({ error: 'User is not connected to anyone' });
        }

        const partner = couple.user1._id.equals(user._id) ? couple.user2 : couple.user1;
        res.status(200).send({ partner });
    } catch (error) {
        console.error('Fetching couple error:', error);
        res.status(500).send({ error: 'Failed to fetch partner' });
    }
});

app.get('/invitations/:username', async (req, res) => {
    const { username } = req.params;
    const { status } = req.query; // Get the status from the query params

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        const invitations = await Invite.find({
            receiver: user._id,
            status: status || 'pending' // Default to pending if no status is provided
        }).populate('sender', 'username');

        res.status(200).send({ invitations });
    } catch (error) {
        console.error('Fetching invitations error:', error);
        res.status(500).send({ error: 'Failed to fetch invitations' });
    }
});





const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)
});

