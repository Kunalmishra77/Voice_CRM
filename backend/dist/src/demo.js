import { prisma } from './db.js';
import { faker } from '@faker-js/faker';
const INDIAN_NAMES = [
    'Arun Sharma', 'Priya Singh', 'Rahul Verma', 'Sneha Kapoor', 'Amit Patel',
    'Sanjay Gupta', 'Anjali Desai', 'Vikram Malhotra', 'Neha Reddy', 'Rajesh Iyer',
    'Kiran Rao', 'Sandeep Maheshwari', 'Ankur Warikoo', 'Kunal Shah', 'Ritesh Agarwal'
];
const INDIAN_CITIES = ['Delhi', 'Mumbai', 'Pune', 'Jaipur', 'Lucknow', 'Bangalore', 'Hyderabad', 'Gurugram'];
const HINGLISH_INBOUND = [
    'Price kitna hai iska?',
    'Bhai details bhej do jaldi.',
    'Kya ye Delhi me available hai?',
    'Discount milega kya? Diwali offer hai?',
    'Bro location share karna office ki.',
    'Interested hoon, call back karo please.',
    'Payment options kya kya hain?',
    'Aapka timing kya hai kal ka?',
    'Mujhe Brochure chahiye pdf me.',
    'Online delivery hogi Pune me?'
];
const HINGLISH_OUTBOUND = [
    'Sure sir, details abhi bhejta hoon.',
    'Hello! Kaise help kar sakte hain aapki?',
    '₹12,500 se start hota hai hamara base package.',
    'Haanji, bilkul available hai.',
    'Aap apna number de dijiye, team call kar legi.',
    'Visit timings 10 AM to 7 PM hain.',
    'Aapka brochure ready hai, check kijiye.'
];
export async function clearDatabase() {
    await prisma.message.deleteMany();
    await prisma.leadInsight.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.contact.deleteMany();
}
export async function generateDemoData(count = 10) {
    for (let i = 0; i < count; i++) {
        const phone = '91' + faker.string.numeric(10);
        const name = faker.helpers.arrayElement(INDIAN_NAMES);
        const stage = faker.helpers.arrayElement(['new', 'hot', 'warm', 'cold']);
        const status = faker.helpers.arrayElement(['open', 'open', 'closed']);
        const city = faker.helpers.arrayElement(INDIAN_CITIES);
        const source = faker.helpers.arrayElement(['WhatsApp', 'Website', 'Referral']);
        const languagePreference = faker.helpers.arrayElement(['Hindi', 'English', 'Hindi/English']);
        const contact = await prisma.contact.create({
            data: {
                phone,
                name,
                city,
                source,
                languagePreference,
                tags: faker.helpers.arrayElements(['Priority', 'Support', 'Sales', 'Old Customer', 'Diwali Lead'], { min: 0, max: 2 }),
            },
        });
        const conversation = await prisma.conversation.create({
            data: {
                contactId: contact.id,
                stage,
                status,
                lastMessageAt: faker.date.recent({ days: 7 }),
            }
        });
        const msgCount = faker.number.int({ min: 2, max: 6 });
        let lastMsgDate = faker.date.recent({ days: 7 });
        for (let j = 0; j < msgCount; j++) {
            const isOut = j % 2 !== 0; // Alternating messages
            lastMsgDate = new Date(lastMsgDate.getTime() + faker.number.int({ min: 1000, max: 600000 }));
            await prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    direction: isOut ? 'out' : 'in',
                    text: isOut ? faker.helpers.arrayElement(HINGLISH_OUTBOUND) : faker.helpers.arrayElement(HINGLISH_INBOUND),
                    timestamp: lastMsgDate,
                }
            });
        }
        await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: lastMsgDate }
        });
        if (stage === 'hot' || faker.datatype.boolean({ probability: 0.2 })) {
            await prisma.leadInsight.create({
                data: {
                    contactId: contact.id,
                    leadStage: stage,
                    score: faker.number.int({ min: 50, max: 100 }),
                    actionRequired: true,
                    notes: faker.helpers.arrayElement([
                        'Wants delivery in ' + city + ' by tomorrow.',
                        'Asked for ' + languagePreference + ' support specifically.',
                        'Interested in premium ₹12,500 package.',
                        'Source: ' + source + ' - High priority lead.'
                    ]),
                }
            });
        }
    }
}
export async function simulateWebhookBurst(count = 5) {
    const openConversations = await prisma.conversation.findMany({
        where: { status: 'open' },
        include: { contact: true }
    });
    if (openConversations.length === 0)
        return;
    for (let i = 0; i < count; i++) {
        const conv = faker.helpers.arrayElement(openConversations);
        const newStage = faker.helpers.arrayElement(['warm', 'hot', 'hot']);
        const msg = await prisma.message.create({
            data: {
                conversationId: conv.id,
                direction: 'in',
                text: faker.helpers.arrayElement(HINGLISH_INBOUND),
                timestamp: new Date(),
            }
        });
        await prisma.conversation.update({
            where: { id: conv.id },
            data: {
                stage: newStage,
                lastMessageAt: msg.timestamp
            }
        });
        if (newStage === 'hot') {
            await prisma.leadInsight.upsert({
                where: { contactId: conv.contactId },
                update: { score: 99, actionRequired: true, notes: 'Hot lead detected! Customer asked: ' + msg.text },
                create: {
                    contactId: conv.contactId,
                    leadStage: 'hot',
                    score: 95,
                    actionRequired: true,
                    notes: 'Hot lead detected! Customer asked: ' + msg.text,
                }
            });
        }
    }
}
