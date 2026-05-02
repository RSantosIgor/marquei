import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.importJobRow.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.workSchedule.deleteMany();
  await prisma.professionalService.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  // ─── Manager ─────────────────────────────────────────
  const manager = await prisma.user.create({
    data: {
      email: 'gestor@marquei.com',
      password: passwordHash,
      name: 'Ana Silva',
      phone: '(11) 99999-0000',
      role: Role.MANAGER,
    },
  });
  console.log(`  ✔ Manager: ${manager.email}`);

  // ─── Professionals ───────────────────────────────────
  const profUsersData = [
    { email: 'carla@marquei.com', name: 'Carla Oliveira', phone: '(11) 99999-0001', specialty: 'Cabelo' },
    { email: 'marcos@marquei.com', name: 'Marcos Santos', phone: '(11) 99999-0002', specialty: 'Barba' },
    { email: 'julia@marquei.com', name: 'Julia Costa', phone: '(11) 99999-0003', specialty: 'Unhas' },
  ];

  const professionals = [];
  for (const data of profUsersData) {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        name: data.name,
        phone: data.phone,
        role: Role.PROFESSIONAL,
      },
    });
    const professional = await prisma.professional.create({
      data: {
        userId: user.id,
        specialty: data.specialty,
      },
    });
    professionals.push(professional);
    console.log(`  ✔ Professional: ${data.email} (${data.specialty})`);
  }

  // ─── Services ────────────────────────────────────────
  const servicesData = [
    { name: 'Corte Feminino', duration: 60, price: 80.0 },
    { name: 'Corte Masculino', duration: 30, price: 45.0 },
    { name: 'Escova', duration: 45, price: 60.0 },
    { name: 'Manicure', duration: 40, price: 35.0 },
    { name: 'Pedicure', duration: 50, price: 40.0 },
  ];

  const services = [];
  for (const data of servicesData) {
    const service = await prisma.service.create({ data });
    services.push(service);
    console.log(`  ✔ Service: ${data.name}`);
  }

  // ─── Link professionals to services ──────────────────
  // Carla: Corte Feminino, Escova
  await prisma.professionalService.createMany({
    data: [
      { professionalId: professionals[0].id, serviceId: services[0].id },
      { professionalId: professionals[0].id, serviceId: services[2].id },
    ],
  });
  // Marcos: Corte Masculino
  await prisma.professionalService.create({
    data: { professionalId: professionals[1].id, serviceId: services[1].id },
  });
  // Julia: Manicure, Pedicure
  await prisma.professionalService.createMany({
    data: [
      { professionalId: professionals[2].id, serviceId: services[3].id },
      { professionalId: professionals[2].id, serviceId: services[4].id },
    ],
  });
  console.log('  ✔ Professional-Service links created');

  // ─── Work Schedules (Mon-Fri 09:00-18:00, Sat 09:00-13:00) ──
  for (const prof of professionals) {
    const weekdaySchedules = [1, 2, 3, 4, 5].map((day) => ({
      professionalId: prof.id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '18:00',
    }));
    const saturdaySchedule = {
      professionalId: prof.id,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '13:00',
    };
    await prisma.workSchedule.createMany({
      data: [...weekdaySchedules, saturdaySchedule],
    });
  }
  console.log('  ✔ Work schedules created');

  // ─── Clients ─────────────────────────────────────────
  const clientsData = [
    { email: 'maria@email.com', name: 'Maria Fernandes', phone: '(11) 98888-0001' },
    { email: 'joao@email.com', name: 'João Pereira', phone: '(11) 98888-0002' },
    { email: 'camila@email.com', name: 'Camila Lima', phone: '(11) 98888-0003' },
    { email: 'pedro@email.com', name: 'Pedro Almeida', phone: '(11) 98888-0004' },
    { email: 'fernanda@email.com', name: 'Fernanda Souza', phone: '(11) 98888-0005' },
    { email: 'lucas@email.com', name: 'Lucas Martins', phone: '(11) 98888-0006' },
    { email: 'beatriz@email.com', name: 'Beatriz Rocha', phone: '(11) 98888-0007' },
    { email: 'rafael@email.com', name: 'Rafael Dias', phone: '(11) 98888-0008' },
    { email: 'larissa@email.com', name: 'Larissa Gomes', phone: '(11) 98888-0009' },
    { email: 'thiago@email.com', name: 'Thiago Ribeiro', phone: '(11) 98888-0010' },
  ];

  const customers = [];
  for (const data of clientsData) {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: passwordHash,
        name: data.name,
        phone: data.phone,
        role: Role.CLIENT,
      },
    });
    const customer = await prisma.customer.create({
      data: { userId: user.id },
    });
    customers.push(customer);
  }
  console.log(`  ✔ ${customers.length} clients created`);

  // ─── Appointments ────────────────────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const appointmentsData: {
    customerId: string;
    professionalId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
  }[] = [];

  // Past appointments (last 7 days)
  for (let dayOffset = -7; dayOffset < 0; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() === 0) continue; // skip Sunday

    // 3 appointments per day
    const slots = [
      { hour: 9, customer: 0, professional: 0, service: 0 },
      { hour: 11, customer: 1, professional: 1, service: 1 },
      { hour: 14, customer: 2, professional: 2, service: 3 },
    ];

    for (const slot of slots) {
      const startTime = new Date(date);
      startTime.setHours(slot.hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + servicesData[slot.service].duration);

      appointmentsData.push({
        customerId: customers[slot.customer].id,
        professionalId: professionals[slot.professional].id,
        serviceId: services[slot.service].id,
        startTime,
        endTime,
        status: AppointmentStatus.COMPLETED,
      });
    }
  }

  // Future appointments (next 7 days)
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() === 0) continue; // skip Sunday

    const slots = [
      { hour: 10, customer: 3, professional: 0, service: 2 },
      { hour: 13, customer: 4, professional: 1, service: 1 },
      { hour: 15, customer: 5, professional: 2, service: 4 },
    ];

    for (const slot of slots) {
      const startTime = new Date(date);
      startTime.setHours(slot.hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + servicesData[slot.service].duration);

      appointmentsData.push({
        customerId: customers[slot.customer].id,
        professionalId: professionals[slot.professional].id,
        serviceId: services[slot.service].id,
        startTime,
        endTime,
        status: AppointmentStatus.SCHEDULED,
      });
    }
  }

  // A couple cancelled ones
  if (appointmentsData.length > 5) {
    appointmentsData[3].status = AppointmentStatus.CANCELLED;
    appointmentsData[4].status = AppointmentStatus.NO_SHOW;
  }

  for (const data of appointmentsData) {
    await prisma.appointment.create({ data });
  }
  console.log(`  ✔ ${appointmentsData.length} appointments created`);

  console.log('\n✅ Seed completed!');
  console.log('\n📋 Login credentials (all passwords: 123456):');
  console.log('   Gestor:       gestor@marquei.com');
  console.log('   Profissional: carla@marquei.com / marcos@marquei.com / julia@marquei.com');
  console.log('   Cliente:      maria@email.com (and 9 others)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
