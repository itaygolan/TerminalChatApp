const {ChatManager, TokenProvider} = require('@pusher/chatkit');
const {JSDOM} = require('jsdom');
const util = require('util');
const prompt = require('prompt');
const axios = require('axios');
const readline = require('readline');
const ora = require('ora');

const makeChatkitNodeCompatible = () => {
    const { window } = new JSDOM();
    global.window = window;
    global.navigator = {};
};

makeChatkitNodeCompatible();

const createUser = async (username) => {
    try {
        await axios.post('http://localhost:3001/users', { username });
    } catch ({ message }) {
        throw new Error(`Failed to create a user: ${message}`);
    }
}

const main = async () => {
    const spinner = ora();
    try {
        // Initalize Chat
        prompt.start();
        prompt.message = '';

        const get  = util.promisify(prompt.get);

        const usernameSchema = [
            {
                description: 'Enter your username',
                name: 'username',
                required: 'true'
            }
        ];

        // Ask user for username
        const { username } = await get(usernameSchema);
        
        // Create user with username and post to server
        spinner.start(`Authenticating...`);
        await createUser(username);
        spinner.succeed(`Authenticated as ${username}`);

        // Initialize Chatkit
        const chatManager = new ChatManager({
            instanceLocator: "v1:us1:9ceb4a40-ab7d-452d-ac35-42bf08649899",
            userId: username,
            tokenProvider: new TokenProvider({ url: `http://localhost:3001/authenticate` }),
        });

        spinner.start(`Connecting to chatroom...`);
        const currentUser = await chatManager.connect(); //chatManager returns the current user
        spinner.succeed(`Connected`);

        const joinableRooms = await currentUser.getJoinableRooms();
        const availableRooms = [...currentUser.rooms, ...joinableRooms];
        console.log('Available rooms:');
        availableRooms.forEach((room, i) => {
            console.log(`${i} - ${room.name}`);
        })

        const roomSchema =[
            {
                description: 'Select a room',
                name: 'room',
                conform: v => {
                    if (v >= availableRooms.length) {
                        return false;
                    }
                    return true;
                },
                message: 'Room must only be numbers',
                required: true
            }
        ];

        const { room: chosenRoom } = await get(roomSchema);
        const room = availableRooms[chosenRoom];

        spinner.start(`Joining room ${room}...`);
        await currentUser.subscribeToRoom({
            roomId: room.id,
            hooks: { // whenever new message is recieved
                onNewMessage: message => {
                    const { senderId, text } = message;
                    if (senderId === username) return;
                    console.log(`${senderId}: ${text}`);
                }
            },
            messageLimit: 0
        })
        spinner.succeed(`Joined ${room.name} sucessfully`);

        const input = readline.createInterface({ input: process.stdin });
        input.on('line', async text => {
            await currentUser.sendMessage({roomId: room.id, text});
        })

    } catch (err) {
        spinner.fail();
        console.log(`Failed with err: ${err}`);
        process.exit(1);
    }
}

main();