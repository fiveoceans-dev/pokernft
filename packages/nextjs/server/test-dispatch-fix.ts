import { createGameEngine } from './game-engine/newIndex';

async function testDispatchFix() {
  console.log('🔧 TESTING DISPATCH FIX\n');
  
  const engine = createGameEngine('dispatch-test', 50, 10);
  
  let stateCount = 0;
  engine.on('stateChanged', (room) => {
    stateCount++;
    const playerWithTurn = room.players.find(p => p.isTurn);
    console.log(`📡 State ${stateCount}: ${room.stage}, turn=${room.currentTurnIndex}, actor=${playerWithTurn ? playerWithTurn.id.slice(0,6) : 'none'}`);
  });
  
  engine.addPlayer({ id: 'player1', seat: 0, chips: 1000 });
  engine.addPlayer({ id: 'player2', seat: 1, chips: 1000 });
  
  console.log('\n--- STARTING HAND ---');
  const startTime = Date.now();
  await engine.startHand();
  const duration = Date.now() - startTime;
  console.log(`--- COMPLETED IN ${duration}ms ---\n`);
  
  const finalState = engine.getState();
  console.log('📊 FINAL STATE:');
  console.log(`   Stage: ${finalState.stage}`);
  console.log(`   CurrentTurnIndex: ${finalState.currentTurnIndex}`);
  console.log(`   State changes: ${stateCount}`);
  
  const playerWithTurn = finalState.players.find(p => p.isTurn);
  const success = finalState.stage === 'preflop' && 
                 finalState.currentTurnIndex >= 0 && 
                 playerWithTurn?.isTurn === true;
  
  console.log(`\n🎯 SUCCESS: ${success ? '✅ YES' : '❌ NO'}`);
  return success;
}

testDispatchFix()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });