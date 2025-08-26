# 📡 WebSocket API Reference

Complete reference for the PokerNFT WebSocket API, covering all client commands and server events.

## 🔗 Connection

### WebSocket Endpoint

**Production**: `wss://your-poker-server.herokuapp.com`  
**Development**: `ws://localhost:8080`

### Connection Flow

```javascript
// Establish connection
const ws = new WebSocket('wss://your-poker-server.herokuapp.com')

ws.onopen = () => {
  console.log('Connected to PokerNFT server')
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  console.log('Received:', message)
}

// Send commands
ws.send(JSON.stringify({
  cmdId: Date.now().toString(),
  type: 'LIST_TABLES'
}))
```

### Authentication

Currently using session-based authentication:
- Each WebSocket connection gets a unique session ID
- Sessions persist for reconnections
- User authentication via wallet address binding

## 📤 Client Commands

All client commands follow this structure:

```typescript
interface ClientCommand {
  cmdId: string        // Unique command identifier
  type: CommandType    // Command type
  // Additional parameters based on command type
}
```

### 📋 LIST_TABLES

Get list of available poker tables.

**Request:**
```json
{
  "cmdId": "cmd_001",
  "type": "LIST_TABLES"
}
```

**Response:** [TABLE_LIST](#table_list) event

### 🏗️ CREATE_TABLE

Create a new poker table.

**Request:**
```json
{
  "cmdId": "cmd_002",
  "type": "CREATE_TABLE",
  "name": "High Stakes Table"
}
```

**Parameters:**
- `name` (string): Display name for the table

**Response:** [TABLE_CREATED](#table_created) event

### 🪑 SIT

Join a poker table at a specific seat.

**Request:**
```json
{
  "cmdId": "cmd_003",
  "type": "SIT",
  "tableId": "andromeda",
  "seat": 0,
  "buyIn": 10000
}
```

**Parameters:**
- `tableId` (string): Unique table identifier
- `seat` (number): Seat index (0-5)
- `buyIn` (number): Buy-in amount in chips

**Validation:**
- Seat must be available (not occupied)
- Buy-in must be within table limits
- Player cannot already be seated at table

**Response:** [PLAYER_JOINED](#player_joined) event on success, [ERROR](#error) on failure

### 🚪 LEAVE

Leave the current poker table.

**Request:**
```json
{
  "cmdId": "cmd_004",
  "type": "LEAVE"
}
```

**Response:** [PLAYER_LEFT](#player_left) event

### 🎮 ACTION

Perform a poker action during your turn.

**Request:**
```json
{
  "cmdId": "cmd_005",
  "type": "ACTION",
  "action": "RAISE",
  "amount": 200
}
```

**Parameters:**
- `action` (string): Poker action - `"FOLD"`, `"CHECK"`, `"CALL"`, `"RAISE"`, `"ALL_IN"`
- `amount` (number, optional): Bet/raise amount (required for RAISE)

**Validation:**
- Must be player's turn
- Action must be valid for current game state
- Raise amount must meet minimum raise requirements

**Response:** [PLAYER_ACTION_APPLIED](#player_action_applied) event

### 💰 REBUY

Add more chips to your stack.

**Request:**
```json
{
  "cmdId": "cmd_006",
  "type": "REBUY",
  "amount": 5000
}
```

**Parameters:**
- `amount` (number): Additional chips to purchase

**Validation:**
- Amount must be positive
- Total stack cannot exceed table maximum
- Player must be seated at table

**Response:** [TABLE_SNAPSHOT](#table_snapshot) event with updated player chips

### 💺 SIT_OUT / SIT_IN

Temporarily leave or rejoin active play while remaining seated.

**Request:**
```json
{
  "cmdId": "cmd_007",
  "type": "SIT_OUT"
}
```

```json
{
  "cmdId": "cmd_008",
  "type": "SIT_IN"
}
```

**Response:** [TABLE_SNAPSHOT](#table_snapshot) event with updated player status

### 🔄 REATTACH

Reconnect to an existing session after disconnection.

**Request:**
```json
{
  "cmdId": "cmd_009",
  "type": "REATTACH",
  "sessionId": "session_abc123"
}
```

**Parameters:**
- `sessionId` (string): Previous session identifier

**Response:** [SESSION](#session) event with restored session

### 🔗 ATTACH

Bind current session to a wallet address.

**Request:**
```json
{
  "cmdId": "cmd_010",
  "type": "ATTACH",
  "userId": "0x1234...abcd"
}
```

**Parameters:**
- `userId` (string): Wallet address or user identifier

**Response:** [SESSION](#session) event with updated user binding

## 📥 Server Events

All server events follow this structure:

```typescript
interface ServerEvent {
  tableId: string      // Table identifier (empty for global events)
  type: EventType      // Event type
  // Additional data based on event type
}
```

### 🔑 SESSION

Session establishment or update.

**Event:**
```json
{
  "tableId": "",
  "type": "SESSION",
  "sessionId": "session_abc123",
  "userId": "0x1234...abcd"
}
```

**Fields:**
- `sessionId` (string): Unique session identifier
- `userId` (string, optional): Bound wallet address

### 📋 TABLE_LIST

List of available poker tables.

**Event:**
```json
{
  "tableId": "",
  "type": "TABLE_LIST",
  "tables": [
    {
      "id": "andromeda",
      "name": "🌌 Andromeda Station",
      "players": 3,
      "maxPlayers": 6,
      "blinds": {
        "small": 25,
        "big": 50
      },
      "minBuyIn": 1000,
      "maxBuyIn": 10000
    }
  ]
}
```

**Table Fields:**
- `id` (string): Unique table identifier
- `name` (string): Display name
- `players` (number): Current player count
- `maxPlayers` (number): Maximum players (usually 6)
- `blinds` (object): Small and big blind amounts
- `minBuyIn` (number): Minimum buy-in amount
- `maxBuyIn` (number): Maximum buy-in amount

### 🏗️ TABLE_CREATED

Confirmation of table creation.

**Event:**
```json
{
  "tableId": "uuid-generated",
  "type": "TABLE_CREATED",
  "table": {
    "id": "uuid-generated",
    "name": "Custom Table"
  }
}
```

### 📊 TABLE_SNAPSHOT

Complete table state update.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "TABLE_SNAPSHOT",
  "table": {
    "id": "andromeda",
    "stage": "preflop",
    "players": [
      {
        "id": "0x1234...abcd",
        "nickname": "0x1234...",
        "seat": 0,
        "chips": 9500,
        "currentBet": 50,
        "cards": ["AS", "KH"],
        "isActive": true,
        "isTurn": false,
        "hasActed": false,
        "isAllIn": false,
        "isSittingOut": false
      }
    ],
    "communityCards": ["QS", "JH", "10D"],
    "pot": 150,
    "currentRound": "flop",
    "actingIndex": 1,
    "buttonIndex": 0,
    "smallBlindIndex": 1,
    "bigBlindIndex": 2,
    "betToCall": 0,
    "minRaise": 50,
    "lastAction": {
      "playerId": "0x5678...efgh",
      "action": "CALL",
      "amount": 50
    }
  }
}
```

**Game Stages:**
- `waiting`: Waiting for players
- `preflop`: Before community cards
- `flop`: After first 3 community cards
- `turn`: After 4th community card  
- `river`: After 5th community card
- `showdown`: Revealing hands and determining winner

### 👥 PLAYER_JOINED

Player joined the table.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "PLAYER_JOINED",
  "seat": 2,
  "playerId": "0x1234...abcd"
}
```

### 🚪 PLAYER_LEFT

Player left the table.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "PLAYER_LEFT",
  "seat": 2,
  "playerId": "0x1234...abcd"
}
```

### 🔌 PLAYER_DISCONNECTED

Player disconnected (but may rejoin).

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "PLAYER_DISCONNECTED",
  "seat": 2,
  "playerId": "0x1234...abcd"
}
```

### 🔄 PLAYER_REJOINED

Player reconnected after disconnection.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "PLAYER_REJOINED",
  "seat": 2,
  "playerId": "0x1234...abcd"
}
```

### ⏰ GAME_START_COUNTDOWN

Game starting countdown with 2+ players.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "GAME_START_COUNTDOWN",
  "countdown": 5
}
```

**Fields:**
- `countdown` (number): Seconds remaining until game starts

### 🎲 HAND_START

New poker hand beginning.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "HAND_START"
}
```

### 🏁 HAND_END

Current hand completed.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "HAND_END"
}
```

### 🃏 DEAL_FLOP

First three community cards dealt.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "DEAL_FLOP",
  "cards": ["QS", "JH", "10D"]
}
```

### 🃏 DEAL_TURN

Fourth community card dealt.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "DEAL_TURN",
  "card": "9C"
}
```

### 🃏 DEAL_RIVER

Fifth community card dealt.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "DEAL_RIVER",
  "card": "8S"
}
```

### 🎯 ACTION_PROMPT

Player's turn to act.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "ACTION_PROMPT",
  "actingIndex": 2,
  "betToCall": 100,
  "minRaise": 200,
  "timeLeftMs": 30000
}
```

**Fields:**
- `actingIndex` (number): Seat index of acting player
- `betToCall` (number): Amount needed to call
- `minRaise` (number): Minimum raise amount
- `timeLeftMs` (number): Milliseconds until action timeout

### ⏱️ ACTION_TIMEOUT

Action timeout countdown.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "ACTION_TIMEOUT",
  "countdown": 10
}
```

### ✅ PLAYER_ACTION_APPLIED

Player action processed successfully.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "PLAYER_ACTION_APPLIED",
  "playerId": "0x1234...abcd",
  "action": "RAISE",
  "amount": 200
}
```

### 🔄 ROUND_END

Betting round completed.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "ROUND_END",
  "street": "PREFLOP"
}
```

**Streets:**
- `PREFLOP`: Initial betting round
- `FLOP`: After first 3 community cards
- `TURN`: After 4th community card
- `RIVER`: After 5th community card

### 👑 BLINDS_POSTED

Blinds have been posted.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "BLINDS_POSTED"
}
```

### ❌ ERROR

Error occurred processing command.

**Event:**
```json
{
  "tableId": "andromeda",
  "type": "ERROR",
  "code": "SEAT_TAKEN",
  "msg": "Seat already occupied"
}
```

**Common Error Codes:**
- `INVALID_SEAT`: Seat index out of range
- `SEAT_TAKEN`: Seat already occupied
- `INVALID_BUYIN`: Buy-in outside allowed range
- `ACTION_FAILED`: Invalid action for current game state
- `SEATING_FAILED`: Failed to take seat for unknown reason
- `REBUY_FAILED`: Invalid rebuy amount
- `UNKNOWN_COMMAND`: Command type not recognized
- `BAD_JSON`: Invalid JSON in message

## 🎴 Card Representation

Cards are represented as two-character strings:

**Format:** `[Rank][Suit]`

**Ranks:** `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `J`, `Q`, `K`, `A`  
**Suits:** `S` (Spades), `H` (Hearts), `D` (Diamonds), `C` (Clubs)

**Examples:**
- `AS` = Ace of Spades
- `KH` = King of Hearts
- `10D` = Ten of Diamonds
- `2C` = Two of Clubs

## 🎯 Game State Management

### Player States

```typescript
interface Player {
  id: string           // Wallet address or session ID
  nickname: string     // Display name (shortened address)
  seat: number         // Seat index (0-5)
  chips: number        // Current chip count
  currentBet: number   // Current bet in this round
  cards: string[]      // Hole cards (hidden from others)
  isActive: boolean    // Participating in current hand
  isTurn: boolean      // Currently acting
  hasActed: boolean    // Has acted this betting round
  isAllIn: boolean     // All chips committed
  isSittingOut: boolean // Temporarily not playing
}
```

### Table States

```typescript
interface GameRoom {
  id: string                // Unique table identifier
  stage: GameStage          // Current game stage
  players: Player[]         // All players at table
  communityCards: string[]  // Shared community cards
  pot: number              // Total pot amount
  currentRound: Round      // Current betting round
  actingIndex: number      // Current acting player seat
  buttonIndex: number      // Dealer button position
  smallBlindIndex: number  // Small blind position
  bigBlindIndex: number    // Big blind position
  betToCall: number        // Amount to call
  minRaise: number         // Minimum raise amount
}
```

## 🔄 Typical Game Flow

### 1. Connection & Table Selection

```javascript
// 1. Connect to server
const ws = new WebSocket('wss://your-server.com')

// 2. Get session
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'SESSION') {
    sessionId = msg.sessionId
  }
}

// 3. List available tables
ws.send(JSON.stringify({
  cmdId: '1',
  type: 'LIST_TABLES'
}))

// 4. Join a table
ws.send(JSON.stringify({
  cmdId: '2',
  type: 'SIT',
  tableId: 'andromeda',
  seat: 2,
  buyIn: 5000
}))
```

### 2. Game Start Sequence

```
1. PLAYER_JOINED events as players join
2. GAME_START_COUNTDOWN (when 2+ players present)
3. HAND_START (countdown reaches 0)
4. TABLE_SNAPSHOT (initial hand state with hole cards)
5. BLINDS_POSTED (blinds automatically posted)
6. ACTION_PROMPT (first player to act)
```

### 3. Betting Rounds

```
PREFLOP:
- ACTION_PROMPT for each player
- PLAYER_ACTION_APPLIED for each action
- ROUND_END when betting complete

FLOP:
- DEAL_FLOP (3 community cards)
- ACTION_PROMPT/PLAYER_ACTION_APPLIED sequence
- ROUND_END

TURN:
- DEAL_TURN (4th community card)
- Betting sequence...

RIVER:
- DEAL_RIVER (5th community card)  
- Final betting sequence...

SHOWDOWN:
- HAND_END
- TABLE_SNAPSHOT (updated chip counts)
```

### 4. Action Handling

```javascript
// Handle action prompts
if (msg.type === 'ACTION_PROMPT' && msg.actingIndex === mySeaTIndex) {
  // Player's turn - show action buttons
  showActionButtons(msg.betToCall, msg.minRaise, msg.timeLeftMs)
}

// Send action
function fold() {
  ws.send(JSON.stringify({
    cmdId: Date.now().toString(),
    type: 'ACTION',
    action: 'FOLD'
  }))
}

function call() {
  ws.send(JSON.stringify({
    cmdId: Date.now().toString(),
    type: 'ACTION', 
    action: 'CALL'
  }))
}

function raise(amount) {
  ws.send(JSON.stringify({
    cmdId: Date.now().toString(),
    type: 'ACTION',
    action: 'RAISE',
    amount: amount
  }))
}
```

## 🧪 Testing the API

### Manual Testing with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to server
wscat -c wss://your-poker-server.herokuapp.com

# Send commands interactively
> {"cmdId":"1","type":"LIST_TABLES"}
< {"tableId":"","type":"TABLE_LIST","tables":[...]}

> {"cmdId":"2","type":"SIT","tableId":"andromeda","seat":0,"buyIn":5000}
< {"tableId":"andromeda","type":"PLAYER_JOINED","seat":0,"playerId":"..."}
```

### Automated Testing

```javascript
// Example test script
const WebSocket = require('ws')

async function testPokerAPI() {
  const ws = new WebSocket('wss://your-server.com')
  
  ws.on('open', () => {
    console.log('Connected')
    
    // Test sequence
    ws.send(JSON.stringify({
      cmdId: '1',
      type: 'LIST_TABLES'
    }))
  })
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data)
    console.log('Received:', msg.type)
    
    if (msg.type === 'TABLE_LIST') {
      // Join first available table
      ws.send(JSON.stringify({
        cmdId: '2',
        type: 'SIT',
        tableId: msg.tables[0].id,
        seat: 0,
        buyIn: 5000
      }))
    }
  })
}

testPokerAPI()
```

## 🔐 Security Considerations

### Command Validation

All commands are validated server-side:
- Command ID uniqueness prevents replay attacks
- Player permissions checked for each action
- Game state validation prevents invalid moves
- Input sanitization prevents injection attacks

### Session Management

- Session IDs are cryptographically secure
- Sessions expire after periods of inactivity
- Reconnection requires valid session ID
- User binding provides additional authentication layer

### Rate Limiting

Built-in protection against:
- Command flooding (max commands per second)
- Connection abuse (max connections per IP)
- Invalid command penalties

---

This completes the WebSocket API reference for the PokerNFT multiplayer poker server. The API provides comprehensive real-time communication for poker game functionality with proper error handling and security measures.