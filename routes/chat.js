import express from 'express';

const router = express.Router();

const FAQ_KNOWLEDGE = [
  {
    keywords: ['book', 'appointment', 'how to book', 'slot'],
    response: {
      en: 'To book an appointment, go to the "Book Appointment" tab, select your preferred Department, Doctor, and Date. Choose an available (teal) time slot and submit your contact details. You will receive an instant WhatsApp confirmation with your token number!',
      hi: 'अपॉइंटमेंट बुक करने के लिए, "Book Appointment" टैब पर जाएं, अपना पसंदीदा विभाग, डॉक्टर और तिथि चुनें। उपलब्ध (हरा) स्लॉट चुनें और अपना विवरण भरें। आपको टोकन नंबर के साथ व्हाट्सएप पर सूचना मिलेगी!',
      mr: 'अपॉइंटमेंट बुक करण्यासाठी, "Book Appointment" टॅबवर जा, तुमचा विभाग, डॉक्टर आणि तारीख निवडा. उपलब्ध (हिरवा) स्लॉट निवडा आणि माहिती भरा. तुम्हाला तात्काळ व्हॉट्सअ‍ॅपवर टोकन नंबर मिळेल!'
    }
  },
  {
    keywords: ['queue', 'token', 'live queue', 'status', 'wait'],
    response: {
      en: 'You can check your real-time queue position on the "Live Queue" page! Enter your Token Number or select your doctor to see currently called tokens and estimated waiting times.',
      hi: 'आप "Live Queue" पेज पर अपनी कतार की स्थिति देख सकते हैं! वर्तमान टोकन और अनुमानित प्रतीक्षा समय देखने के लिए अपना टोकन नंबर दर्ज करें।',
      mr: 'तुम्ही "Live Queue" पृष्ठावर तुमची रांगेतील स्थिती पाहू शकता! सध्या सुरू असलेला टोकन आणि अंदाजित वेळ पाहण्यासाठी तुमचा टोकन नंबर प्रविष्ट करा.'
    }
  },
  {
    keywords: ['miss', 'missed', 'late', 'shift', 'grace'],
    response: {
      en: 'MediCare offers an automatic 10-minute grace period! If you are late, our intelligent queue system automatically shifts you to the next available slot for the day and sends an update to your WhatsApp.',
      hi: 'मेडीकेअर 10 मिनट की छूट अवधि प्रदान करता है! यदि आपको देर हो जाती है, तो सिस्टम आपको स्वचालित रूप से अगले उपलब्ध स्लॉट में स्थानांतरित कर देता है और व्हाट्सएप पर संदेश भेजता है।',
      mr: 'मेडीकेअर 10 मिनिटांचा अतिरिक्त वेळ देते! उशीर झाल्यास, प्रणाली तुम्हाला स्वयंचलितपणे पुढच्या उपलब्ध स्लॉटमध्ये हलवते आणि व्हॉट्सअ‍ॅपवर संदेश पाठवते.'
    }
  },
  {
    keywords: ['reschedule', 'change time', 'change date'],
    response: {
      en: 'To reschedule, log in to your Patient Dashboard, view your appointment, and click "Reschedule". Select any available slot to get a newly confirmed slot and updated token.',
      hi: 'रीशेड्यूल करने के लिए, अपने पेशेंट डैशबोर्ड में लॉगिन करें, अपॉइंटमेंट देखें और "Reschedule" पर क्लिक करें।',
      mr: 'वेळ बदलण्यासाठी, तुमच्या रुग्ण डॅशबोर्डवर लॉगिन करा आणि "Reschedule" वर क्लिक करा. नवीन उपलब्ध वेळ निवडा.'
    }
  },
  {
    keywords: ['emergency', 'ambulance', 'urgent', 'fast'],
    response: {
      en: '🚨 For emergencies, immediately call our 24/7 MediCare Emergency Hotline: +91 98765 43210 or 108. Fast ambulance dispatch is available 24 hours a day.',
      hi: '🚨 आपातकालीन स्थिति के लिए, तुरंत हमारी 24/7 हेल्पलाइन पर कॉल करें: +91 98765 43210 या 108। एम्बुलेंस सेवा 24 घंटे उपलब्ध है।',
      mr: '🚨 आणीबाणीसाठी, आमच्या 24/7 हेल्पलाइनवर त्वरित कॉल करा: +91 98765 43210 किंवा 108. रुग्णवाहिका 24 तास उपलब्ध आहे.'
    }
  },
  {
    keywords: ['heart', 'cardiology', 'chest pain'],
    response: {
      en: 'Our Cardiology department is headed by Dr. Rajesh Sharma (MBBS, MD Cardiology). We provide state-of-the-art ECG, Echo, and preventive cardiac care in Room 101.',
      hi: 'हमारा कार्डियोलॉजी विभाग डॉ. राजेश शर्मा (एमबीबीएस, एमडी) द्वारा संचालित है। हम कक्ष 101 में उत्कृष्ट हृदय जांच और उपचार प्रदान करते हैं।',
      mr: 'आमचा हृदयविभाग डॉ. राजेश शर्मा यांच्या मार्गदर्शनाखाली चालतो. रूम 101 मध्ये अत्याधुनिक तपासणी व उपचार उपलब्ध आहेत.'
    }
  },
  {
    keywords: ['dental', 'tooth', 'teeth'],
    response: {
      en: 'Dr. Priya Patil specializes in advanced cosmetic dentistry, orthodontics, and painless root canal treatments in Room 204.',
      hi: 'डॉ. प्रिया पाटिल रूम 204 में दंत चिकित्सा और रूट कैनाल उपचार प्रदान करती हैं।',
      mr: 'डॉ. प्रिया पाटील रूम 204 मध्ये दंतचिकित्सा आणि दातदुखीवर उपचार करतात.'
    }
  }
];

// POST /api/chat
router.post('/', (req, res) => {
  const { message, lang = 'en' } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  const query = message.toLowerCase().trim();
  const matched = FAQ_KNOWLEDGE.find(item =>
    item.keywords.some(k => query.includes(k))
  );

  let reply = '';
  if (matched) {
    reply = matched.response[lang] || matched.response['en'];
  } else {
    // Friendly fallback
    const fallbacks = {
      en: "I am MediCare Assistant! I can help you book slots, check real-time queue position, find doctor timings, or provide emergency guidance. How can I assist your health journey today?",
      hi: "मैं मेडीकेअर सहायक हूँ! मैं अपॉइंटमेंट बुकिंग, लाइव टोकन स्थिति और डॉक्टर की जानकारी में आपकी मदद कर सकता हूँ। बताएं मैं क्या मदद करूँ?",
      mr: "मी मेडीकेअर सहाय्यक आहे! मी अपॉइंटमेंट बुकिंग, थेट टोकन स्थिती आणि डॉक्टरांच्या माहितीसाठी मदत करू शकतो. मी कशी मदत करू?"
    };
    reply = fallbacks[lang] || fallbacks['en'];
  }

  res.json({ success: true, reply });
});

export default router;
