// ──────────────────────────────────────────────────────────────────────────
// test-adapter-integration.js — Validation script for StoreAdapter integration
//
// Run this in the browser console after loading JoineryTech Portal -dev-.html
// to verify the observable adapter is correctly wired into app-store.jsx
//
// Expected output:
//   ✓ All checks pass → Integration successful
//   ❌ Any check fails → Review integration steps
// ──────────────────────────────────────────────────────────────────────────

(function testAdapterIntegration() {
  console.group('🔍 StoreAdapter Integration Test');

  let passCount = 0;
  let failCount = 0;

  function test(name, condition, details) {
    if (condition) {
      console.log(`✓ ${name}`);
      passCount++;
    } else {
      console.error(`❌ ${name}`, details || '');
      failCount++;
    }
  }

  // Test 1: StoreAdapter loaded from stores-bundle.js
  test(
    'StoreAdapter available on window',
    typeof window.StoreAdapter !== 'undefined',
    'stores-bundle.js may not have loaded before app-store.jsx'
  );

  // Test 2: window.sim (app-store API) is available
  test(
    'window.sim (app-store API) available',
    typeof window.sim !== 'undefined' && typeof window.sim.getState === 'function'
  );

  // Test 3: Check if adapter actions are wired into api
  const sliceActions = ['createLead', 'addToCart', 'recordStockMovement', 'createJob', 'addCatalogItem'];
  let actionsFound = 0;
  sliceActions.forEach(actionName => {
    if (typeof window.sim[actionName] === 'function') {
      actionsFound++;
    }
  });

  test(
    'Slice actions available in window.sim',
    actionsFound === sliceActions.length,
    `Found ${actionsFound}/${sliceActions.length} actions: ${sliceActions.join(', ')}`
  );

  // Test 4: Try calling a slice action (dry run)
  let actionCallSuccess = false;
  try {
    const stateBefore = JSON.parse(JSON.stringify(window.sim.getState()));
    window.sim.createLead({
      email: 'test@integration.test',
      company: 'Test Integration Co.',
      source: 'integration-test'
    });
    const stateAfter = window.sim.getState();
    actionCallSuccess = (stateAfter.leads && stateAfter.leads.length > stateBefore.leads.length);
  } catch (error) {
    console.error('Action call error:', error);
  }

  test(
    'createLead() action works correctly',
    actionCallSuccess,
    'Action should update state.leads array'
  );

  // Test 5: Verify state updates trigger observers
  let observerCalled = false;
  const unsubscribe = window.sim.subscribe(() => {
    observerCalled = true;
  });

  window.sim.addToCart({ id: 'TEST-001', name: 'Test Item', price: 100, qty: 1 });
  unsubscribe();

  test(
    'Observer notifications work',
    observerCalled,
    'Slice actions should trigger observer.emit()'
  );

  // Summary
  console.groupEnd();
  console.log('\n' + '═'.repeat(60));
  if (failCount === 0) {
    console.log(`%c ✓ ALL TESTS PASSED (${passCount}/${passCount})`, 'color: green; font-weight: bold');
    console.log('Integration successful! Adapter is correctly wired.');
  } else {
    console.log(`%c ❌ ${failCount} TESTS FAILED (${passCount}/${passCount + failCount} passed)`, 'color: red; font-weight: bold');
    console.log('Review integration steps in Phase 1-B documentation.');
  }
  console.log('═'.repeat(60));

  return { passCount, failCount };
})();
