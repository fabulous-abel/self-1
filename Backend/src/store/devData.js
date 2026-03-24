const crypto = require("crypto");

const {
  getPosition,
  joinQueue,
  leaveQueue,
  notifyTurn,
  serializeQueue,
} = require("../services/queueEngine");

const queues = new Map();
const users = new Map();
const usersByPhone = new Map();
const drivers = new Map();
const driversByUserId = new Map();
const rides = new Map();
const payments = new Map();
const autoTurnTimers = new Map();

const DEFAULT_DRIVER_EARNINGS = Object.freeze({
  currency: "ETB",
  today: 1280,
  week: 6840,
  month: 27300,
  total: 27300,
});

const DEFAULT_DRIVER_VEHICLE = Object.freeze({
  brand: "Toyota",
  model: "Vitz",
  plateNumber: "AA-18264",
  color: "Pearl White",
  photoUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC8PFqZUDNrieW7u_P1CKoTxJa_P4Yl2HPpe_40HavtxD0QmTppYtOgnBsb0kXeqzM__UXDXUjNHHPQQ5IfrsfciWlMW5jiPjwVldA0w2IzyKWkX9wHPx6tyk6UzX2RNkkvsuHwrAG9Pxu73LImQne0bm9GPTXB88c_nmjyWZNxdwH0N4kzCeoumXSQnrqrAQXTwt0tArDQT_B84PsHVCSWC9zi4iv3S28jORBtFyxI8OcailsHnCbzbUTrO6jeOnkQw-W6UngnyRU0",
});

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("251")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+251${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `+251${digits}`;
  }

  return String(phone || "").trim();
}

function phoneKey(role, phone) {
  return `${role}:${normalizePhone(phone)}`;
}

function serializeLocation(location) {
  return {
    latitude: Number(location.latitude || 0),
    longitude: Number(location.longitude || 0),
  };
}

function cloneVehicle(vehicle = {}) {
  return {
    brand: String(vehicle.brand || ""),
    model: String(vehicle.model || ""),
    plateNumber: String(vehicle.plateNumber || vehicle.licensePlate || ""),
    color: String(vehicle.color || ""),
    photoUrl: String(vehicle.photoUrl || ""),
  };
}

function createUser({ phone, name, role }) {
  const normalizedPhone = normalizePhone(phone);
  const key = phoneKey(role, normalizedPhone);
  const existingId = usersByPhone.get(key);

  if (existingId) {
    const existingUser = users.get(existingId) || null;
    if (existingUser && name && existingUser.name !== name) {
      existingUser.name = name;
    }
    return existingUser;
  }

  const user = {
    id: createId("user"),
    phone: normalizedPhone,
    name,
    role,
    createdAt: nowIso(),
  };

  users.set(user.id, user);
  usersByPhone.set(key, user.id);
  return user;
}

function createSeedEntries(queueId, passengers) {
  return passengers.map((passenger, index) => {
    const user = createUser({
      phone: passenger.phone,
      name: passenger.name,
      role: "passenger",
    });

    return {
      passengerId: user.id,
      passengerName: user.name,
      phone: user.phone,
      pickupLabel: passenger.pickupLabel,
      destinationLabel: passenger.destinationLabel,
      position: index + 1,
      status: "waiting",
      joinedAt: new Date(Date.now() - ((passengers.length - index) * 60 * 1000)),
      graceExpiresAt: null,
    };
  });
}

function seedQueues() {
  const seedData = [
    {
      id: "bole-airport",
      name: "Bole Airport Stand",
      type: "Taxi",
      averageWaitMinutes: 15,
      capacity: 4,
      location: {
        latitude: 8.9838,
        longitude: 38.7993,
      },
      passengers: [
        {
          name: "Hana M.",
          phone: "+251911000101",
          pickupLabel: "Bole Terminal 1",
          destinationLabel: "Kazanchis",
        },
        {
          name: "Dawit K.",
          phone: "+251911000102",
          pickupLabel: "Bole Rwanda Road",
          destinationLabel: "Mexico Square",
        },
        {
          name: "Marta S.",
          phone: "+251911000103",
          pickupLabel: "Edna Mall Main Gate",
          destinationLabel: "CMC Roundabout",
        },
      ],
    },
    {
      id: "mexico-square",
      name: "Mexico Square Hub",
      type: "Bus",
      averageWaitMinutes: 8,
      capacity: 12,
      location: {
        latitude: 9.0108,
        longitude: 38.7615,
      },
      passengers: [
        {
          name: "Abebe T.",
          phone: "+251911000104",
          pickupLabel: "Mexico Square South Gate",
          destinationLabel: "Piassa",
        },
      ],
    },
    {
      id: "piassa-hub",
      name: "Piassa Square",
      type: "Bus",
      averageWaitMinutes: 6,
      capacity: 10,
      location: {
        latitude: 9.0417,
        longitude: 38.7461,
      },
      passengers: [],
    },
  ];

  seedData.forEach((queue) => {
    queues.set(queue.id, {
      ...queue,
      _id: queue.id,
      entries: createSeedEntries(queue.id, queue.passengers),
    });
  });
}

function getQueue(queueId) {
  return queues.get(String(queueId)) || null;
}

function defaultQueueId() {
  return "bole-airport";
}

function createDriverRecord({
  phone,
  name,
  queueId = defaultQueueId(),
  status = "offline",
  vehicle = DEFAULT_DRIVER_VEHICLE,
  earnings = DEFAULT_DRIVER_EARNINGS,
  completedToday = 5,
}) {
  const user = createUser({
    phone,
    name,
    role: "driver",
  });
  const existingDriverId = driversByUserId.get(user.id);
  const existingDriver = existingDriverId ? drivers.get(existingDriverId) : null;

  const driver = {
    id: existingDriver ? existingDriver.id : createId("driver"),
    userId: user.id,
    queueId,
    status,
    vehicle: cloneVehicle(vehicle),
    documents: {
      vehiclePhotoUrl: String(vehicle.photoUrl || ""),
      lastUploadedDocumentType: "",
    },
    earnings: {
      currency: String(earnings.currency || DEFAULT_DRIVER_EARNINGS.currency),
      today: Number(earnings.today || 0),
      week: Number(earnings.week || 0),
      month: Number(earnings.month || 0),
      total: Number(earnings.total || 0),
    },
    completedToday: Number(completedToday || 0),
    activeRideId: existingDriver ? existingDriver.activeRideId : null,
    createdAt: existingDriver ? existingDriver.createdAt : nowIso(),
    updatedAt: nowIso(),
  };

  drivers.set(driver.id, driver);
  driversByUserId.set(user.id, driver.id);
  return driver;
}

function seedDrivers() {
  createDriverRecord({
    phone: "+251911000777",
    name: "Meron T.",
    queueId: "bole-airport",
    status: "offline",
  });
}

seedQueues();
seedDrivers();

function getDriverByUserId(userId) {
  const driverId = driversByUserId.get(String(userId));
  if (!driverId) {
    return null;
  }

  return drivers.get(driverId) || null;
}

function getDriverById(driverId) {
  return drivers.get(String(driverId)) || null;
}

function findDriverForQueue(queueId) {
  return Array.from(drivers.values()).find(
    (driver) => String(driver.queueId) === String(queueId),
  ) || null;
}

function serializeVehicle(vehicle) {
  const normalizedVehicle = cloneVehicle(vehicle);

  return {
    brand: normalizedVehicle.brand,
    model: normalizedVehicle.model,
    licensePlate: normalizedVehicle.plateNumber,
    plateNumber: normalizedVehicle.plateNumber,
    color: normalizedVehicle.color,
    photoUrl: normalizedVehicle.photoUrl,
  };
}

function serializeEarnings(driver) {
  return {
    currency: String(driver.earnings.currency || "ETB"),
    today: Number(driver.earnings.today || 0),
    week: Number(driver.earnings.week || 0),
    month: Number(driver.earnings.month || 0),
    total: Number(driver.earnings.total || 0),
  };
}

function summarizeQueue(queue) {
  return {
    id: queue.id,
    name: queue.name,
    type: queue.type,
    capacity: queue.capacity,
    waitingCount: queue.entries.length,
    averageWaitMinutes: queue.averageWaitMinutes,
    location: serializeLocation(queue.location),
  };
}

function serializeDriver(driver) {
  const user = getUserById(driver.userId);
  const queue = getQueue(driver.queueId);

  return {
    id: driver.id,
    userId: driver.userId,
    name: user ? user.name : "Driver",
    phone: user ? user.phone : "",
    status: driver.status,
    isOnline: driver.status === "online",
    queueId: queue ? queue.id : driver.queueId,
    queueName: queue ? queue.name : "Assigned Queue",
    vehicle: serializeVehicle(driver.vehicle),
    documents: {
      vehiclePhotoUrl: String(driver.documents.vehiclePhotoUrl || ""),
      lastUploadedDocumentType: String(driver.documents.lastUploadedDocumentType || ""),
    },
    completedToday: Number(driver.completedToday || 0),
  };
}

function serializeDriverQueueEntry(entry) {
  return {
    id: String(entry.passengerId),
    passengerId: String(entry.passengerId),
    passengerName: String(entry.passengerName || "Passenger"),
    pickupLabel: String(entry.pickupLabel || ""),
    destinationLabel: String(entry.destinationLabel || "Addis Ababa City Center"),
    position: Number(entry.position || 0),
    status: String(entry.status || "waiting"),
    joinedAt:
      entry.joinedAt instanceof Date
        ? entry.joinedAt.toISOString()
        : String(entry.joinedAt || ""),
  };
}

function serializeRide(ride) {
  if (!ride) {
    return null;
  }

  return {
    id: ride.id,
    queueId: ride.queueId,
    passengerIds: ride.passengerIds,
    passengers: Number(ride.passengers || 1),
    passengerName: String(ride.passengerName || "Passenger"),
    pickupLabel: String(ride.pickupLabel || ""),
    destinationLabel: String(ride.destinationLabel || "Addis Ababa City Center"),
    driverId: ride.driverId || null,
    driverUserId: ride.driverUserId || null,
    driverName: String(ride.driverName || "Driver"),
    vehiclePlate: String(ride.vehiclePlate || ""),
    status: String(ride.status || "accepted"),
    fareEtb: Number(ride.fareEtb || 0),
    driverLocation: serializeLocation(ride.driverLocation || {}),
    createdAt: String(ride.createdAt || ""),
    arrivedAt: ride.arrivedAt || null,
    completedAt: ride.completedAt || null,
  };
}

function estimateWaitMinutes(queue, position) {
  if (!position || position <= 1) {
    return 0;
  }

  return Math.max(1, Math.round(queue.averageWaitMinutes * ((position - 1) / 2)));
}

function queuePositionPayload(queue, passengerId) {
  const position = getPosition(queue, passengerId);
  const entry = queue.entries.find(
    (item) => String(item.passengerId) === String(passengerId),
  );
  const yourTurn = Boolean(entry && entry.status === "notified");

  return {
    queueId: queue.id,
    position,
    estimatedWaitMinutes: yourTurn ? 0 : estimateWaitMinutes(queue, position),
    yourTurn,
    liveDriverLocation: {
      latitude: queue.location.latitude + 0.0045,
      longitude: queue.location.longitude + 0.0052,
    },
  };
}

function getDriverDashboard(userId) {
  const driver = getDriverByUserId(userId);

  if (!driver) {
    return null;
  }

  const queue = getQueue(driver.queueId);
  const activeRide = driver.activeRideId ? rides.get(driver.activeRideId) : null;

  return {
    driver: serializeDriver(driver),
    queue: queue ? summarizeQueue(queue) : null,
    entries: queue ? queue.entries.map(serializeDriverQueueEntry) : [],
    activeRide: serializeRide(activeRide),
    earnings: serializeEarnings(driver),
    completedToday: Number(driver.completedToday || 0),
  };
}

function emitDriverDashboard(io, userId) {
  if (!io) {
    return;
  }

  const payload = getDriverDashboard(userId);
  if (!payload) {
    return;
  }

  io.to(`user:${userId}`).emit("driver:dashboard", payload);
}

function emitDriverDashboardsForQueue(io, queueId) {
  if (!io) {
    return;
  }

  Array.from(drivers.values())
    .filter((driver) => String(driver.queueId) === String(queueId))
    .forEach((driver) => {
      emitDriverDashboard(io, driver.userId);
    });
}

function emitQueueUpdated(io, queue) {
  if (!io) {
    return;
  }

  io.to(`queue:${queue.id}`).emit("queue:updated", {
    ...summarizeQueue(queue),
    queue: serializeQueue(queue),
  });
  emitDriverDashboardsForQueue(io, queue.id);
}

function clearAutoTurn(queueId, passengerId) {
  const timerKey = `${queueId}:${passengerId}`;
  const timer = autoTurnTimers.get(timerKey);

  if (timer) {
    clearTimeout(timer);
    autoTurnTimers.delete(timerKey);
  }
}

function promotePassengerToFront(queue, passengerId) {
  const index = queue.entries.findIndex(
    (entry) => String(entry.passengerId) === String(passengerId),
  );

  if (index <= 0) {
    return queue.entries[0] || null;
  }

  const [entry] = queue.entries.splice(index, 1);
  queue.entries.unshift(entry);
  queue.entries.forEach((item, position) => {
    item.position = position + 1;
  });

  return entry;
}

function scheduleAutoTurn(io, queue, passengerId) {
  clearAutoTurn(queue.id, passengerId);

  const timer = setTimeout(() => {
    promotePassengerToFront(queue, passengerId);
    notifyTurn(io, queue);
    emitQueueUpdated(io, queue);
    clearAutoTurn(queue.id, passengerId);
  }, 8000);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  autoTurnTimers.set(`${queue.id}:${passengerId}`, timer);
}

function findOrCreatePassenger(phone) {
  const normalizedPhone = normalizePhone(phone);
  return createUser({
    phone: normalizedPhone,
    name: `Passenger ${normalizedPhone.slice(-4) || "User"}`,
    role: "passenger",
  });
}

function ensureDriverForUser(user) {
  const existingDriver = getDriverByUserId(user.id);
  if (existingDriver) {
    return existingDriver;
  }

  return createDriverRecord({
    phone: user.phone,
    name: user.name,
    queueId: defaultQueueId(),
    status: "offline",
  });
}

function findOrCreateDriver(phone) {
  const normalizedPhone = normalizePhone(phone);
  const user = createUser({
    phone: normalizedPhone,
    name: `Driver ${normalizedPhone.slice(-4) || "User"}`,
    role: "driver",
  });

  ensureDriverForUser(user);
  return user;
}

function getUserById(userId) {
  return users.get(String(userId)) || null;
}

function listQueues() {
  return Array.from(queues.values()).map(summarizeQueue);
}

function getQueueDetails(queueId) {
  const queue = getQueue(queueId);

  if (!queue) {
    return null;
  }

  return {
    ...summarizeQueue(queue),
    entries: queue.entries.map((entry) => ({
      passengerId: entry.passengerId,
      passengerName: entry.passengerName,
      pickupLabel: entry.pickupLabel,
      destinationLabel: entry.destinationLabel,
      position: entry.position,
      status: entry.status,
      joinedAt: entry.joinedAt,
    })),
  };
}

function addPassengerToQueue({ queueId, passengerId, io }) {
  const queue = getQueue(queueId);

  if (!queue) {
    return null;
  }

  const passenger = getUserById(passengerId);
  const result = joinQueue(queue, passengerId);

  if (result.entry) {
    result.entry.passengerName = passenger ? passenger.name : "Passenger";
    result.entry.phone = passenger ? passenger.phone : "";
    result.entry.pickupLabel = result.entry.pickupLabel || queue.name;
    result.entry.destinationLabel =
      result.entry.destinationLabel || "Addis Ababa City Center";
  }

  emitQueueUpdated(io, queue);

  if (result.position === 1) {
    notifyTurn(io, queue);
    emitQueueUpdated(io, queue);
  } else {
    scheduleAutoTurn(io, queue, passengerId);
  }

  return {
    queue: summarizeQueue(queue),
    ...queuePositionPayload(queue, passengerId),
    alreadyQueued: result.alreadyQueued,
  };
}

function removePassengerFromQueue({ queueId, passengerId, io }) {
  const queue = getQueue(queueId);

  if (!queue) {
    return null;
  }

  const removed = leaveQueue(queue, passengerId);
  clearAutoTurn(queueId, passengerId);
  emitQueueUpdated(io, queue);

  return removed;
}

function getPassengerQueuePosition(queueId, passengerId) {
  const queue = getQueue(queueId);

  if (!queue) {
    return null;
  }

  const position = getPosition(queue, passengerId);
  if (!position) {
    return null;
  }

  return {
    queue: summarizeQueue(queue),
    ...queuePositionPayload(queue, passengerId),
  };
}

function createRide({
  queueId,
  passengerId,
  pickupLabel,
  passengers,
  driverId,
  destinationLabel,
  passengerName,
  assignToDriver = false,
}) {
  const queue = getQueue(queueId);
  const passenger = getUserById(passengerId);
  const driver = driverId
    ? getDriverById(driverId)
    : findDriverForQueue(queueId);
  const driverUser = driver ? getUserById(driver.userId) : null;

  const ride = {
    id: createId("ride"),
    queueId,
    passengerIds: [passengerId],
    passengers,
    passengerName:
      passengerName ||
      (passenger ? passenger.name : `Passenger ${String(passengerId).slice(-4)}`),
    pickupLabel,
    destinationLabel: destinationLabel || "Addis Ababa City Center",
    driverId: driver ? driver.id : null,
    driverUserId: driver ? driver.userId : null,
    driverName: driverUser ? driverUser.name : "Meron T.",
    vehiclePlate: driver ? driver.vehicle.plateNumber : "AA-18264",
    status: assignToDriver ? "en_route_pickup" : "accepted",
    fareEtb: 165 + (passengers * 20),
    driverLocation: {
      latitude: (queue && queue.location.latitude + 0.0032) || 9.0352,
      longitude: (queue && queue.location.longitude + 0.0035) || 38.7524,
    },
    createdAt: nowIso(),
    arrivedAt: null,
    completedAt: null,
  };

  rides.set(ride.id, ride);

  if (assignToDriver && driver) {
    driver.activeRideId = ride.id;
    driver.updatedAt = nowIso();
  }

  return serializeRide(ride);
}

function getRide(rideId) {
  return serializeRide(rides.get(String(rideId)) || null);
}

function createPayment({ rideId, amount, method }) {
  const payment = {
    id: createId("payment"),
    rideId,
    method: method || "telebirr",
    amount,
    status: "paid",
    reference: `TBR-${Math.round(amount)}-${Date.now()}`,
    createdAt: nowIso(),
  };

  payments.set(payment.id, payment);
  return payment;
}

function getPayment(paymentId) {
  return payments.get(String(paymentId)) || null;
}

function setDriverAvailability({ userId, online, io }) {
  const driver = getDriverByUserId(userId);

  if (!driver) {
    return null;
  }

  driver.status = online ? "online" : "offline";
  driver.updatedAt = nowIso();
  emitDriverDashboard(io, userId);
  return getDriverDashboard(userId);
}

function acceptNextPassenger({ userId, io }) {
  const driver = getDriverByUserId(userId);

  if (!driver) {
    return null;
  }

  if (driver.activeRideId) {
    return {
      error: "Complete the active ride before accepting a new passenger.",
      dashboard: getDriverDashboard(userId),
    };
  }

  const queue = getQueue(driver.queueId);
  if (!queue || queue.entries.length === 0) {
    return {
      ride: null,
      dashboard: getDriverDashboard(userId),
    };
  }

  const nextEntry = queue.entries[0];
  clearAutoTurn(queue.id, nextEntry.passengerId);
  leaveQueue(queue, nextEntry.passengerId);

  if (queue.entries.length > 0) {
    notifyTurn(io, queue);
  }

  emitQueueUpdated(io, queue);

  const ride = createRide({
    queueId: queue.id,
    passengerId: nextEntry.passengerId,
    passengers: 1,
    pickupLabel: nextEntry.pickupLabel || queue.name,
    destinationLabel: nextEntry.destinationLabel,
    passengerName: nextEntry.passengerName,
    driverId: driver.id,
    assignToDriver: true,
  });

  emitDriverDashboard(io, userId);

  return {
    ride,
    dashboard: getDriverDashboard(userId),
  };
}

function updateDriverRideStatus({ userId, rideId, status, io }) {
  const driver = getDriverByUserId(userId);
  const ride = rides.get(String(rideId)) || null;

  if (!driver || !ride) {
    return null;
  }

  if (ride.driverUserId !== userId || driver.activeRideId !== ride.id) {
    return {
      error: "Ride is not assigned to this driver.",
      dashboard: getDriverDashboard(userId),
    };
  }

  if (status === "arrived") {
    ride.status = "arrived";
    ride.arrivedAt = nowIso();
  } else if (status === "completed") {
    ride.status = "completed";
    ride.completedAt = nowIso();
    driver.activeRideId = null;
    driver.completedToday += 1;
    driver.earnings.today += Number(ride.fareEtb || 0);
    driver.earnings.week += Number(ride.fareEtb || 0);
    driver.earnings.month += Number(ride.fareEtb || 0);
    driver.earnings.total += Number(ride.fareEtb || 0);
  }

  driver.updatedAt = nowIso();
  emitDriverDashboard(io, userId);

  return {
    ride: serializeRide(ride),
    dashboard: getDriverDashboard(userId),
  };
}

function updateDriverVehicle({
  userId,
  brand,
  model,
  licensePlate,
  color,
  io,
}) {
  const driver = getDriverByUserId(userId);

  if (!driver) {
    return null;
  }

  driver.vehicle.brand = String(brand || driver.vehicle.brand || "");
  driver.vehicle.model = String(model || driver.vehicle.model || "");
  driver.vehicle.plateNumber = String(
    licensePlate || driver.vehicle.plateNumber || "",
  );
  driver.vehicle.color = String(color || driver.vehicle.color || "");
  driver.updatedAt = nowIso();
  emitDriverDashboard(io, userId);

  return serializeVehicle(driver.vehicle);
}

function uploadDriverDocument({ userId, documentType, io }) {
  const driver = getDriverByUserId(userId);

  if (!driver) {
    return null;
  }

  const documentUrl = `https://linket-self.local/uploads/${documentType}.png`;
  driver.documents.lastUploadedDocumentType = documentType;

  if (documentType === "vehicle_photo") {
    driver.vehicle.photoUrl = documentUrl;
    driver.documents.vehiclePhotoUrl = documentUrl;
  }

  driver.updatedAt = nowIso();
  emitDriverDashboard(io, userId);

  return {
    documentType,
    url: documentUrl,
  };
}

function getDriverProfile(userId) {
  const driver = getDriverByUserId(userId);
  if (!driver) {
    return null;
  }

  return serializeDriver(driver);
}

function getDriverEarnings(userId) {
  const driver = getDriverByUserId(userId);
  if (!driver) {
    return null;
  }

  return {
    ...serializeEarnings(driver),
    completedToday: Number(driver.completedToday || 0),
  };
}

module.exports = {
  acceptNextPassenger,
  addPassengerToQueue,
  createPayment,
  createRide,
  findOrCreateDriver,
  findOrCreatePassenger,
  getDriverDashboard,
  getDriverEarnings,
  getDriverProfile,
  getPassengerQueuePosition,
  getPayment,
  getQueue,
  getQueueDetails,
  getRide,
  getUserById,
  listQueues,
  normalizePhone,
  removePassengerFromQueue,
  setDriverAvailability,
  updateDriverRideStatus,
  updateDriverVehicle,
  uploadDriverDocument,
};
