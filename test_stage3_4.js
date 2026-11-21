import http from 'http';
import crypto from 'crypto';

const QR_SECRET = process.env.QR_SECRET || 'healpath_qr_checkin_secret_key_2026';

function sign(token) {
  return crypto.createHmac('sha256', QR_SECRET).update(token.toString().trim()).digest('hex');
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING STAGE 3 & STAGE 4 INTEGRATION TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let total = 0;

  function assert(cond, msg) {
    total++;
    if (cond) {
      passed++;
      console.log(`  [PASS] ${msg}`);
    } else {
      console.error(`  [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // 1. Check Express doctors endpoint
  console.log('\n[1] Checking Express GET /api/doctors...');
  const docRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/doctors',
    method: 'GET'
  });
  assert(docRes.status === 200, 'GET /api/doctors returns 200 OK');
  assert(docRes.body.success === true, 'Response body success is true');
  assert(Array.isArray(docRes.body.doctors), 'Returned doctors array');
  console.log(`      Found ${docRes.body.doctors.length} doctors in Express datastore`);

  // Verify Sanjeevan Hospital Yavatmal doctors exist
  const docNames = docRes.body.doctors.map(d => d.name);
  const requiredSanjeevan = [
    'Dr. Sunil M. Agrawal',
    'Dr. Vijay S. Kawalkar',
    'Dr. H. S. Bora',
    'Dr. Vinay Pande',
    'Dr. Sheetal S. Agrawal',
    'Dr. Lalit Paldiwal'
  ];
  for (const name of requiredSanjeevan) {
    assert(docNames.includes(name), `Verified Sanjeevan doctor present: ${name}`);
  }

  // 2. Check Sanjeevan Hospital profile endpoint
  console.log('\n[2] Checking GET /api/hospital/sanjivani...');
  const hospRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/hospital/sanjivani',
    method: 'GET'
  });
  assert(hospRes.status === 200, 'GET /api/hospital/sanjivani returns 200 OK');
  assert(hospRes.body.hospital.district === 'Yavatmal', 'Hospital located in Yavatmal 445001');

  // 3. Check Live Queue Board endpoint
  console.log('\n[3] Checking GET /api/queue/live-board...');
  const boardRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/queue/live-board',
    method: 'GET'
  });
  assert(boardRes.status === 200, 'GET /api/queue/live-board returns 200 OK');
  assert(boardRes.body.success === true, 'Live board success is true');
  assert(Array.isArray(boardRes.body.board), 'Board contains array of doctor cards');

  // 4. Test QR Check-in: Invalid HMAC Signature
  console.log('\n[4] Testing POST /api/checkin/self-verify (Invalid signature rejection)...');
  const badSigRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkin/self-verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { token: 'SANJ-001', sig: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' });
  assert(badSigRes.status === 400, 'Tampered/invalid signature correctly rejected with 400 Bad Request');
  assert(badSigRes.body.success === false, 'Tampered signature returned success=false');

  // 5. Test QR Check-in: Valid HMAC Signature
  console.log('\n[5] Testing POST /api/checkin/self-verify with cryptographic HMAC pass...');
  const testToken = 'CARD-001';
  const validSig = sign(testToken);
  const selfCheckinRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkin/self-verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { token: testToken, sig: validSig });

  // Token might be 200 (checked in) or 409 (already checked in on prior test)
  assert([200, 409].includes(selfCheckinRes.status), `Check-in returned valid status (${selfCheckinRes.status})`);
  console.log(`      Status: ${selfCheckinRes.status} (${selfCheckinRes.body.message})`);

  // 6. Test Duplicate Check-in Prevention (Idempotency / 409 Conflict)
  console.log('\n[6] Testing duplicate check-in prevention (409 Conflict)...');
  const dupRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkin/self-verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { token: testToken, sig: validSig });
  assert(dupRes.status === 409, 'Duplicate check-in correctly rejected with 409 Conflict');
  assert(dupRes.body.success === false, 'Duplicate check-in success is false');

  // 7. Test Manual Check-in fallback
  console.log('\n[7] Testing POST /api/checkin/manual-verify (Manual fallback)...');
  const manualRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkin/manual-verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { token: 'NON-EXISTENT-999' });
  assert(manualRes.status === 404, 'Non-existent token correctly rejected with 404 Not Found');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed}/${total} TESTS PASSED (100%)`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
