import { createGoogleMeetSpace, isGoogleMeetConfigured } from './src/services/googleMeet.service.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Is Google Meet configured?", isGoogleMeetConfigured());

async function runTest() {
  console.log("Testing Google Meet API...");
  try {
    const result = await createGoogleMeetSpace();
    console.log("Result:", result);
  } catch(e) {
    console.error("Error:", e);
  }
}

runTest();
