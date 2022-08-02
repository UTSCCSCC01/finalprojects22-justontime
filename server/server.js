import app from './app.js';
import mongoose from 'mongoose';
import WebSocket, {WebSocketServer} from "ws";
import {handleIncomingAuctionAction} from "./controllers/auctionController.js";
import {startAuctionHandler} from "./util/auction/AuctionHandler.js";
import {validateAuctionAction} from "./util/auction/AuctionValidator.js";

const port = process.env.PORT || 3000;
const uri = process.env.JUSTONTIME_DB_URI_LOCAL; //process.env.JUSTONTIME_DB_URI (use this on production)

await mongoose.connect(uri)
.catch(err => {
    console.error(err.stack)
    process.exit(1)
})
.then(async client => {
    // await EventOrganizer.db.dropDatabase();
    // await mongoose.connection.db.dropDatabase();
    //await EventOrganizer.deleteOne({email: "youomachi@gmail.com"});
    //  User.remove({}, () => {console.log("deleted user")})
    // await VerificationToken.deleteMany();
    console.log('connected to mongoDB '+uri);
    const server = app.listen(port, () => {
        console.log('listening on port '+port)
    })
    const websocketServer = new WebSocketServer({ noServer: true, path: "/api/auction"})
    //Handle upgrade request from client
    server.on("upgrade", (request, socket, head) => {
        websocketServer.handleUpgrade(request, socket, head, (websocket) => {
            console.log("Emitting connection for client " + request.socket.remoteAddress);
            websocketServer.emit("connection", websocket, request);
        })
    })
    //Handle socket connection to client and data exchange
    websocketServer.on("connection", function connection(ws) {
        ws.on("message", (data, isBinary) => {
            try {
                const action = isBinary ? data : data.toString();
                handleIncomingAuctionAction(action, ws);
            }catch (err) {
                ws.send(JSON.stringify({}))
            }
        })
    })
    //Start up the AuctionHandler
    startAuctionHandler(websocketServer, process.env.AUCTION_HANDLER_INTERVAL);
});