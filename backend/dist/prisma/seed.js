import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Seeding database...');
    const contact1 = await prisma.contact.upsert({
        where: { phone: '+1234567890' },
        update: {},
        create: {
            phone: '+1234567890',
            name: 'Alice Smith',
            tags: ['vip'],
        },
    });
    const conversation1 = await prisma.conversation.create({
        data: {
            contactId: contact1.id,
            stage: 'hot',
            status: 'open',
        }
    });
    await prisma.message.create({
        data: {
            conversationId: conversation1.id,
            direction: 'in',
            text: 'Hello, I am interested in your services.',
        }
    });
    await prisma.message.create({
        data: {
            conversationId: conversation1.id,
            direction: 'out',
            text: 'Hi Alice! How can we help you today?',
        }
    });
    await prisma.leadInsight.create({
        data: {
            contactId: contact1.id,
            leadStage: 'hot',
            score: 95,
            actionRequired: true,
            notes: 'High intent customer. Follow up immediately.',
        }
    });
    console.log('Seeding completed.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
