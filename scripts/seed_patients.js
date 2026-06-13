const baseUrl = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@queuecure.com';
const ADMIN_PASS = 'admin123';

async function seed() {
  console.log("🚀 Starting Seeding Process...");
  try {
    // 1. Login
    console.log("🔑 Logging in as Admin...");
    const authRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const authData = await authRes.json();
    if (!authRes.ok) throw new Error(authData.message || "Failed to login");
    const token = authData.token;

    // 2. Get doctors
    console.log("👨‍⚕️ Fetching Doctors...");
    const docRes = await fetch(`${baseUrl}/doctors`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const doctors = await docRes.json();
    if (!doctors || doctors.length === 0) throw new Error("No doctors found in DB");

    // 3. Seed patients
    console.log(`⏳ Seeding 10 patients for each of the ${doctors.length} doctors...`);
    for (const doc of doctors) {
      for (let i = 0; i < 10; i++) {
         const res = await fetch(`${baseUrl}/patients`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              patientName: `Test Patient ${i+1} (${doc.name})`,
              phone: `987654321${i}`,
              email: 'maghizhvanban@gmail.com',
              age: 20 + i,
              sex: i % 2 === 0 ? 'Male' : 'Female',
              maritalStatus: 'Single',
              visitPurpose: 'Follow-up',
              reason: 'Routine checkup and consultation',
              doctorId: doc._id,
              estimatedTimeMins: 10,
              isPriority: i === 9 ? true : false // Make the last patient a priority
            })
         });
         
         if (!res.ok) {
           const err = await res.json();
           console.error(`❌ Failed to add patient for Dr. ${doc.name}:`, err.message);
         }
      }
      console.log(`✅ Seeded 10 patients for Dr. ${doc.name}`);
    }

    // 4. Seed Requests
    console.log("⏳ Seeding 5 incoming patient requests...");
    for (let i = 0; i < 5; i++) {
       await fetch(`${baseUrl}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: `Web Request ${i+1}`,
            age: 25 + i,
            sex: 'Female',
            phone: '1234567890',
            maritalStatus: 'Married',
            visitPurpose: 'Consultation',
            reason: 'Feeling unwell for the past few days.',
            doctorId: doctors[i % doctors.length]._id
          })
       });
    }
    console.log(`✅ Seeded 5 incoming requests`);

    console.log("🎉 Seeding Completed Successfully!");
  } catch (error) {
    console.error("❌ Seeding Failed:", error.message);
  }
}

seed();
