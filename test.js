console.log("Running tests...\n")

let testsPass = true;


try {
  const fs = require('fs');
  if (fs.existsSync('./index.js')) {
    console.log('✅ Test 2: index.js exists');
  } else {
    throw new Error('index.js not found');
  }
} catch (error) {
  console.log('❌ Test 2: index.js not found');
  testsPass = false;
}

// Test 3: Check environment
console.log('✅ Test 3: Node.js version:', process.version);

console.log('\n' + (testsPass ? '✅ All tests passed!' : '❌ Some tests failed'));
process.exit(testsPass ? 0 : 1);
