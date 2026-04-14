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
const managedUsers = new Map();
const managedUsersByPhone = new Map();
const broadcasts = new Map();
const dispatchLocations = new Map();
const dispatchStateByLocation = new Map();

let globalFareSettings = {
  currency: "ETB",
  baseFare: 200,
  perKmRate: 20,
  perMinRate: 5,
  platformCommissionPercent: 10,
  surgeMultiplier: 1.0,
};

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

const DEFAULT_DISPATCH_LOCATIONS = Object.freeze([
  "Terminal A",
  "Corporate Exit",
  "Main Gate",
]);

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function safeString(value) {
  return String(value || "").trim();
}

function createStatusError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

function getPhoneDigits(phone) {
  return normalizePhone(phone).replace(/\D/g, "");
}

function buildManagedAuthEmail(role, phone) {
  const digits = getPhoneDigits(phone);
  if (!digits) {
    return "";
  }

  return `${digits}@linket.${role}.auth`;
}

function normalizeLocationKey(value) {
  return safeString(value).toLowerCase();
}

function getTimestampMs(value) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function buildDispatchQueueLocation(index) {
  const row = Math.floor(index / 3);
  const column = index % 3;

  return {
    latitude: 8.985 + (row * 0.014) + (column * 0.0055),
    longitude: 38.755 + (column * 0.011) + (row * 0.0045),
  };
}

function createQueueRecord({
  id = createId("queue"),
  name,
  type = "Dispatch",
  averageWaitMinutes = 8,
  capacity = 4,
  location = buildDispatchQueueLocation(queues.size),
  passengers = [],
}) {
  const queue = {
    id,
    _id: id,
    name,
    type,
    averageWaitMinutes,
    capacity,
    location: serializeLocation(location),
    entries: createSeedEntries(id, passengers),
  };

  queues.set(queue.id, queue);
  return queue;
}

function getQueue(queueId) {
  return queues.get(String(queueId)) || null;
}

function defaultQueueId() {
  return Array.from(queues.values())[0]?.id || "";
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

function sortByNewest(items) {
  return items
    .slice()
    .sort(
      (left, right) =>
        getTimestampMs(right.updatedAt || right.createdAt || right.timestamp) -
        getTimestampMs(left.updatedAt || left.createdAt || left.timestamp),
    );
}

function sortByName(items) {
  return items
    .slice()
    .sort((left, right) => safeString(left.name).localeCompare(safeString(right.name)));
}

function serializeManagedUser(user) {
  return {
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    vehicleInfo: user.vehicleInfo || "",
    source: user.source || "backend",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function createManagedUserRecord({
  role,
  fullName,
  phoneNumber,
  vehicleInfo,
  source = "admin",
}) {
  const cleanRole = safeString(role).toLowerCase();
  const cleanName = safeString(fullName);
  const normalizedPhone = normalizePhone(phoneNumber);
  const cleanVehicleInfo = safeString(vehicleInfo);

  if (!["driver", "passenger"].includes(cleanRole)) {
    throw createStatusError(400, "role must be driver or passenger");
  }

  if (!cleanName || !normalizedPhone) {
    throw createStatusError(400, "Name and a valid Ethiopian phone number are required.");
  }

  if (cleanRole === "driver" && !cleanVehicleInfo) {
    throw createStatusError(400, "Vehicle info is required for drivers.");
  }

  const duplicateKey = phoneKey(cleanRole, normalizedPhone);
  if (managedUsersByPhone.has(duplicateKey)) {
    throw createStatusError(400, "A user already exists for this phone number.");
  }

  const timestamp = nowIso();
  const user = {
    id: createId(`managed_${cleanRole}`),
    role: cleanRole,
    fullName: cleanName,
    phoneNumber: normalizedPhone,
    email: buildManagedAuthEmail(cleanRole, normalizedPhone),
    vehicleInfo: cleanRole === "driver" ? cleanVehicleInfo : "",
    source,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  managedUsers.set(user.id, user);
  managedUsersByPhone.set(duplicateKey, user.id);

  return serializeManagedUser(user);
}

function listManagedUsers(role) {
  const cleanRole = safeString(role).toLowerCase();

  return sortByNewest(
    Array.from(managedUsers.values())
      .filter((user) => !cleanRole || user.role === cleanRole)
      .map(serializeManagedUser),
  );
}

function updateManagedUserRecord(userId, { fullName, phoneNumber, vehicleInfo }) {
  const existingUser = managedUsers.get(String(userId)) || null;

  if (!existingUser) {
    throw createStatusError(404, "User record not found.");
  }

  const cleanName = safeString(fullName);
  const normalizedPhone = normalizePhone(phoneNumber);
  const cleanVehicleInfo = safeString(vehicleInfo);
  const expectedEmail = buildManagedAuthEmail(existingUser.role, existingUser.phoneNumber);

  if (!cleanName || !normalizedPhone) {
    throw createStatusError(400, "Name and a valid Ethiopian phone number are required.");
  }

  if (normalizedPhone !== existingUser.phoneNumber) {
    throw createStatusError(400, "Phone number changes are not supported from admin yet.");
  }

  if (existingUser.email !== expectedEmail) {
    throw createStatusError(400, "Email changes are not supported from admin yet.");
  }

  if (existingUser.role === "driver" && !cleanVehicleInfo) {
    throw createStatusError(400, "Vehicle info is required for drivers.");
  }

  existingUser.fullName = cleanName;
  existingUser.vehicleInfo = existingUser.role === "driver" ? cleanVehicleInfo : "";
  existingUser.updatedAt = nowIso();

  return serializeManagedUser(existingUser);
}

function serializeBroadcast(broadcast) {
  return {
    id: broadcast.id,
    target: broadcast.target,
    message: broadcast.message,
    createdAt: broadcast.createdAt || null,
    updatedAt: broadcast.updatedAt || null,
    createdBy: broadcast.createdBy || "",
    updatedBy: broadcast.updatedBy || "",
  };
}

function listBroadcasts() {
  return sortByNewest(Array.from(broadcasts.values()).map(serializeBroadcast));
}

function createBroadcastRecord({ message, target, createdBy }) {
  const trimmedMessage = safeString(message);
  const cleanTarget = safeString(target) || "both";

  if (!trimmedMessage) {
    throw createStatusError(400, "Broadcast message cannot be empty.");
  }

  const timestamp = nowIso();
  const broadcast = {
    id: createId("broadcast"),
    target: cleanTarget,
    message: trimmedMessage,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: safeString(createdBy) || "admin",
    updatedBy: "",
  };

  broadcasts.set(broadcast.id, broadcast);
  return serializeBroadcast(broadcast);
}

function updateBroadcastRecord(broadcastId, { message, target, updatedBy }) {
  const broadcast = broadcasts.get(String(broadcastId)) || null;

  if (!broadcast) {
    throw createStatusError(404, "Broadcast record not found.");
  }

  const trimmedMessage = safeString(message);
  if (!trimmedMessage) {
    throw createStatusError(400, "Broadcast message cannot be empty.");
  }

  broadcast.message = trimmedMessage;
  broadcast.target = safeString(target) || "both";
  broadcast.updatedBy = safeString(updatedBy) || "admin";
  broadcast.updatedAt = nowIso();

  return serializeBroadcast(broadcast);
}

function serializeDispatchLocation(location) {
  return {
    id: location.id,
    name: location.name,
    queueId: location.queueId || "",
    createdAt: location.createdAt || null,
    updatedAt: location.updatedAt || null,
  };
}

function createEmptyDispatchState() {
  return {
    drivers: [],
    waitingPassengers: [],
    requests: [],
    trips: [],
  };
}

function createDispatchLocationRecord(name) {
  const cleanName = safeString(name);

  if (!cleanName) {
    throw createStatusError(400, "Place name is required.");
  }

  const duplicate = Array.from(dispatchLocations.values()).find(
    (location) => normalizeLocationKey(location.name) === normalizeLocationKey(cleanName),
  );
  if (duplicate) {
    throw createStatusError(400, "A place with that name already exists.");
  }

  const timestamp = nowIso();
  const queue = createQueueRecord({
    name: cleanName,
    location: buildDispatchQueueLocation(queues.size),
  });
  const location = {
    id: createId("dispatch_location"),
    name: cleanName,
    queueId: queue.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  dispatchLocations.set(location.id, location);
  dispatchStateByLocation.set(location.name, createEmptyDispatchState());

  return serializeDispatchLocation(location);
}

function findDispatchLocationById(locationId) {
  return dispatchLocations.get(String(locationId)) || null;
}

function findDispatchLocationByName(locationName) {
  const key = normalizeLocationKey(locationName);

  return (
    Array.from(dispatchLocations.values()).find(
      (location) => normalizeLocationKey(location.name) === key,
    ) || null
  );
}

function ensureDispatchState(locationName) {
  if (!dispatchStateByLocation.has(locationName)) {
    dispatchStateByLocation.set(locationName, createEmptyDispatchState());
  }

  return dispatchStateByLocation.get(locationName);
}

function serializeDispatchDriver(driver) {
  return {
    id: driver.id,
    driverPhone: driver.driverPhone,
    driverName: driver.driverName,
    vehicleInfo: driver.vehicleInfo,
    status: driver.status || "waiting",
    timestamp: driver.timestamp || null,
  };
}

function serializeDispatchPassenger(passenger) {
  return {
    id: passenger.id,
    customerName: passenger.customerName,
    customerPhone: passenger.customerPhone,
    note: passenger.note || "",
    requestedBy: passenger.requestedBy || "",
    createdAt: passenger.createdAt || null,
    source: passenger.source || "admin_call",
  };
}

function serializeDispatchRequest(request) {
  return {
    id: request.id,
    location: request.location,
    customerName: request.customerName,
    customerPhone: request.customerPhone,
    note: request.note || "",
    status: request.status || "queued",
    requestedBy: request.requestedBy || "",
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
    matchedAt: request.matchedAt || null,
    matchedDriverName: request.matchedDriverName || "",
    matchedDriverPhone: request.matchedDriverPhone || "",
  };
}

function serializeDispatchTrip(trip) {
  return {
    id: trip.id,
    driverPhone: trip.driverPhone,
    driverName: trip.driverName,
    vehicleInfo: trip.vehicleInfo,
    zone: trip.zone,
    status: trip.status || "waiting",
    capacity: Number(trip.capacity || 4),
    passengers: Array.isArray(trip.passengers) ? [...trip.passengers] : [],
    latestQueueRequest: trip.latestQueueRequest || null,
    createdAt: trip.createdAt || null,
    updatedAt: trip.updatedAt || null,
  };
}

function listDispatchLocations() {
  return sortByName(Array.from(dispatchLocations.values()).map(serializeDispatchLocation));
}

function getLocationDispatchState(locationName) {
  const location = findDispatchLocationByName(locationName);

  if (!location) {
    throw createStatusError(404, "Place not found.");
  }

  const state = ensureDispatchState(location.name);

  return {
    drivers: sortByNewest(state.drivers.map(serializeDispatchDriver)),
    waitingPassengers: sortByNewest(
      state.waitingPassengers.map(serializeDispatchPassenger),
    ),
    requests: sortByNewest(state.requests.map(serializeDispatchRequest)),
    trips: sortByNewest(state.trips.map(serializeDispatchTrip)),
  };
}

function updateDispatchLocationRecord(locationId, locationName) {
  const location = findDispatchLocationById(locationId);

  if (!location) {
    throw createStatusError(404, "Place not found.");
  }

  const cleanName = safeString(locationName);
  if (!cleanName) {
    throw createStatusError(400, "Place name is required.");
  }

  const duplicate = Array.from(dispatchLocations.values()).find(
    (item) =>
      item.id !== location.id &&
      normalizeLocationKey(item.name) === normalizeLocationKey(cleanName),
  );
  if (duplicate) {
    throw createStatusError(400, "A place with that name already exists.");
  }

  if (location.name !== cleanName) {
    const previousName = location.name;
    const state = ensureDispatchState(location.name);
    dispatchStateByLocation.delete(location.name);

    state.requests.forEach((request) => {
      request.location = cleanName;
      request.updatedAt = nowIso();
    });

    state.trips.forEach((trip) => {
      trip.zone = cleanName;
      trip.updatedAt = nowIso();
    });

    dispatchStateByLocation.set(cleanName, state);
    location.name = cleanName;

    const queue = getQueue(location.queueId);
    if (queue) {
      queue.name = cleanName;
      queue.entries.forEach((entry) => {
        if (!entry.pickupLabel || entry.pickupLabel === previousName) {
          entry.pickupLabel = cleanName;
        }
      });
    }

    Array.from(rides.values()).forEach((ride) => {
      if (
        String(ride.queueId) === String(location.queueId) &&
        (!ride.pickupLabel || ride.pickupLabel === previousName)
      ) {
        ride.pickupLabel = cleanName;
      }
    });
  }

  location.updatedAt = nowIso();
  return serializeDispatchLocation(location);
}

function deleteDispatchLocationRecord(locationId) {
  const location = findDispatchLocationById(locationId);

  if (!location) {
    throw createStatusError(404, "Place not found.");
  }

  if (dispatchLocations.size <= 1) {
    throw createStatusError(400, "Keep at least one place in the dispatch system.");
  }

  const state = ensureDispatchState(location.name);

  if (state.drivers.length > 0) {
    throw createStatusError(400, "Cannot delete a place while drivers are still queued there.");
  }

  if (state.waitingPassengers.length > 0) {
    throw createStatusError(400, "Cannot delete a place while callers are still waiting there.");
  }

  if (state.trips.length > 0) {
    throw createStatusError(400, "Cannot delete a place while it still has active driver trips.");
  }

  if (state.requests.some((request) => request.status === "queued")) {
    throw createStatusError(
      400,
      "Cannot delete a place while phone requests are still queued for it.",
    );
  }

  const queue = getQueue(location.queueId);
  if (queue && queue.entries.length > 0) {
    throw createStatusError(
      400,
      "Cannot delete a place while passengers are still waiting in the mobile queue.",
    );
  }

  const assignedDriver = Array.from(drivers.values()).find(
    (driver) => String(driver.queueId) === String(location.queueId),
  );
  if (assignedDriver) {
    throw createStatusError(
      400,
      "Cannot delete a place while a driver is still assigned to it.",
    );
  }

  const activeRide = Array.from(rides.values()).find(
    (ride) =>
      String(ride.queueId) === String(location.queueId) &&
      String(ride.status || "").toLowerCase() !== "completed",
  );
  if (activeRide) {
    throw createStatusError(
      400,
      "Cannot delete a place while it still has an active matched ride.",
    );
  }

  dispatchLocations.delete(location.id);
  dispatchStateByLocation.delete(location.name);
  if (queue) {
    queues.delete(queue.id);
  }

  return serializeDispatchLocation(location);
}

function createLocationQueueRequest({
  location,
  customerName,
  customerPhone,
  note,
  requestedBy,
}) {
  const dispatchLocation = findDispatchLocationByName(location);
  if (!dispatchLocation) {
    throw createStatusError(404, "Place not found.");
  }

  const cleanName = safeString(customerName);
  const normalizedPhone = normalizePhone(customerPhone);
  const cleanNote = safeString(note);
  const cleanRequestedBy = safeString(requestedBy) || "admin";

  if (!cleanName || !normalizedPhone) {
    throw createStatusError(
      400,
      "Location, customer name, and customer phone are required.",
    );
  }

  const timestamp = nowIso();
  const state = ensureDispatchState(dispatchLocation.name);
  const request = {
    id: createId("phone_request"),
    location: dispatchLocation.name,
    customerName: cleanName,
    customerPhone: normalizedPhone,
    note: cleanNote,
    status: "queued",
    requestedBy: cleanRequestedBy,
    createdAt: timestamp,
    updatedAt: timestamp,
    matchedAt: null,
    matchedDriverName: "",
    matchedDriverPhone: "",
  };

  const availableTrip = state.trips.find(
    (trip) =>
      safeString(trip.status || "waiting") === "waiting" &&
      Array.isArray(trip.passengers) &&
      trip.passengers.length < Number(trip.capacity || 4),
  );

  if (availableTrip) {
    const nextPassengers = availableTrip.passengers.includes(normalizedPhone)
      ? [...availableTrip.passengers]
      : [...availableTrip.passengers, normalizedPhone];

    availableTrip.passengers = nextPassengers;
    availableTrip.latestQueueRequest = {
      customerName: cleanName,
      customerPhone: normalizedPhone,
      note: cleanNote,
      source: "admin_call",
      requestedAt: timestamp,
    };
    availableTrip.updatedAt = timestamp;

    request.status = "matched";
    request.matchedDriverName = availableTrip.driverName;
    request.matchedDriverPhone = availableTrip.driverPhone;
    request.matchedAt = timestamp;
  } else {
    state.waitingPassengers.unshift({
      id: createId("waiting_passenger"),
      customerName: cleanName,
      customerPhone: normalizedPhone,
      note: cleanNote,
      requestedBy: cleanRequestedBy,
      createdAt: timestamp,
      source: "admin_call",
    });
  }

  state.requests.unshift(request);

  return {
    requestId: request.id,
    matched: request.status === "matched",
    driverName: request.matchedDriverName,
    driverPhone: request.matchedDriverPhone,
    location: dispatchLocation.name,
  };
}

function seedManagedUsers() {
  createManagedUserRecord({
    role: "driver",
    fullName: "Dawit Alemu",
    phoneNumber: "0912345678",
    vehicleInfo: "Toyota Vitz - AA 67890",
    source: "seed",
  });

  createManagedUserRecord({
    role: "passenger",
    fullName: "Mekdes Bekele",
    phoneNumber: "0987654321",
    source: "seed",
  });
}

function seedDispatchState() {
  DEFAULT_DISPATCH_LOCATIONS.forEach((locationName) => {
    createDispatchLocationRecord(locationName);
  });

  const terminalState = ensureDispatchState("Terminal A");
  const terminalTimestamp = new Date(Date.now() - (45 * 60 * 1000)).toISOString();
  terminalState.drivers.push({
    id: createId("dispatch_driver"),
    driverPhone: "+251911000777",
    driverName: "Meron T.",
    vehicleInfo: "Toyota Vitz - AA 18264",
    status: "waiting",
    timestamp: terminalTimestamp,
  });
  terminalState.trips.push({
    id: createId("dispatch_trip"),
    driverPhone: "+251911000777",
    driverName: "Meron T.",
    vehicleInfo: "Toyota Vitz - AA 18264",
    zone: "Terminal A",
    status: "waiting",
    capacity: 4,
    passengers: [],
    latestQueueRequest: null,
    createdAt: terminalTimestamp,
    updatedAt: terminalTimestamp,
  });

  const mainGateState = ensureDispatchState("Main Gate");
  const mainGateTimestamp = new Date(Date.now() - (30 * 60 * 1000)).toISOString();
  mainGateState.drivers.push({
    id: createId("dispatch_driver"),
    driverPhone: "+251911000778",
    driverName: "Sami R.",
    vehicleInfo: "Suzuki Dzire - AA 22110",
    status: "waiting",
    timestamp: mainGateTimestamp,
  });
  mainGateState.trips.push({
    id: createId("dispatch_trip"),
    driverPhone: "+251911000778",
    driverName: "Sami R.",
    vehicleInfo: "Suzuki Dzire - AA 22110",
    zone: "Main Gate",
    status: "waiting",
    capacity: 4,
    passengers: [],
    latestQueueRequest: null,
    createdAt: mainGateTimestamp,
    updatedAt: mainGateTimestamp,
  });
}

seedManagedUsers();
seedDispatchState();
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
    availableQueues: listQueues(),
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

function emitPassengerRideMatch(io, passengerId, ride) {
  if (!io || !ride || !passengerId) {
    return;
  }

  io.to(`user:${passengerId}`).emit("ride:matched", {
    ride,
    matchedAt: nowIso(),
  });
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
  return sortByName(Array.from(queues.values()).map(summarizeQueue));
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

function setDriverQueue({ userId, queueId, io }) {
  const driver = getDriverByUserId(userId);

  if (!driver) {
    return null;
  }

  if (driver.activeRideId) {
    return {
      error: "Complete the active ride before changing your place.",
      dashboard: getDriverDashboard(userId),
    };
  }

  const queue = getQueue(queueId);
  if (!queue) {
    return {
      error: "Selected place was not found.",
      dashboard: getDriverDashboard(userId),
    };
  }

  driver.queueId = queue.id;
  driver.updatedAt = nowIso();
  emitDriverDashboard(io, userId);

  return {
    queue: summarizeQueue(queue),
    dashboard: getDriverDashboard(userId),
  };
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
  emitPassengerRideMatch(io, nextEntry.passengerId, ride);

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


function getFareSettings() {
  return { ...globalFareSettings };
}

function updateFareSettings(updates) {
  globalFareSettings = {
    ...globalFareSettings,
    currency: safeString(updates.currency) || globalFareSettings.currency,
    baseFare: updates.baseFare !== undefined ? Number(updates.baseFare) : globalFareSettings.baseFare,
    perKmRate: updates.perKmRate !== undefined ? Number(updates.perKmRate) : globalFareSettings.perKmRate,
    perMinRate: updates.perMinRate !== undefined ? Number(updates.perMinRate) : globalFareSettings.perMinRate,
    platformCommissionPercent: updates.platformCommissionPercent !== undefined ? Number(updates.platformCommissionPercent) : globalFareSettings.platformCommissionPercent,
    surgeMultiplier: updates.surgeMultiplier !== undefined ? Number(updates.surgeMultiplier) : globalFareSettings.surgeMultiplier,
  };
  return { ...globalFareSettings };
}

module.exports = {
  acceptNextPassenger,
  addPassengerToQueue,
  createBroadcastRecord,
  createDispatchLocationRecord,
  createLocationQueueRequest,
  createManagedUserRecord,
  createPayment,
  createRide,
  deleteDispatchLocationRecord,
  findOrCreateDriver,
  findOrCreatePassenger,
  getDriverDashboard,
  getDriverEarnings,
  getDriverProfile,
  getLocationDispatchState,
  getPassengerQueuePosition,
  getPayment,
  getQueue,
  getQueueDetails,
  getRide,
  getUserById,
  listBroadcasts,
  listDispatchLocations,
  listManagedUsers,
  listQueues,
  normalizePhone,
  removePassengerFromQueue,
  setDriverQueue,
  setDriverAvailability,
  updateBroadcastRecord,
  updateDispatchLocationRecord,
  updateDriverRideStatus,
  updateDriverVehicle,
  updateManagedUserRecord,
  uploadDriverDocument,
  getFareSettings,
  updateFareSettings,
};
