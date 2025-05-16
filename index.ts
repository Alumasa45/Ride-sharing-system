abstract class User {
    constructor(protected id: string,
    protected name: string,
    protected email: string,
    protected phone: string,
    protected password: string,
    protected rating: number = 5.0) {}

    getId(): string {
        return this.id;
    }

    getName(): string {
        return this.name;
    }

    getEmail(): string {
        return this.email;
    }

    getRating(): number{
        return this.rating;
    }

    updateRating(newRating: number): void {
        this.rating = (this.rating + newRating) / 2;
  }
}

class Driver extends User {
  constructor(
    id: string,
    name: string,
    email: string,
    phone: string,
    password: string,
    private vehicleId: string,
    private licenseNumber: string,
    private isAvailable: boolean = false,
    private currentLocation: GeoLocation = { latitude: 0, longitude: 0 }
  ) {
    super(id, name, email, phone, password);
  }

  getVehicleId(): string {
    return this.vehicleId;
  }

  setAvailability(isAvailable: boolean): void {
    this.isAvailable = isAvailable;
  }

  isDriverAvailable(): boolean {
    return this.isAvailable;
  }

  updateLocation(location: GeoLocation): void {
    this.currentLocation = location;
  }

  getCurrentLocation(): GeoLocation {
    return this.currentLocation;
  }
}

interface PaymentMethod {
  type: string;
  details: string;
}

class Passenger extends User {
  constructor(
    id: string,
    name: string,
    email: string,
    phone: string,
    password: string,
    private paymentMethods: PaymentMethod[] = []
  ) {
    super(id, name, email, phone, password);
  }

  addPaymentMethod(paymentMethod: PaymentMethod): void {
    this.paymentMethods.push(paymentMethod);
  }

  getPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods;
  }
}

interface GeoLocation {
  latitude: number;
  longitude: number;
}

enum RideStatus {
  REQUESTED = "REQUESTED",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  DRIVER_ARRIVED = "DRIVER_ARRIVED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

class Ride {
  private id: string;
  private passenger: Passenger;
  private driver: Driver | null;
  private pickup: GeoLocation;
  private dropoff: GeoLocation;
  private status: RideStatus;
  private requestTime: Date;
  private startTime: Date | null;
  private endTime: Date | null;
  private fare: number | null;
  private estimatedFare: number;
  private distance: number;
  private passengerRating: number | null;
  private driverRating: number | null;

  constructor(
    id: string,
    passenger: Passenger,
    pickup: GeoLocation,
    dropoff: GeoLocation,
    estimatedFare: number,
    distance: number
  ) {

     this.id = id;
    this.passenger = passenger;
    this.driver = null;
    this.pickup = pickup;
    this.dropoff = dropoff;
    this.status = RideStatus.REQUESTED;
    this.requestTime = new Date();
    this.startTime = null;
    this.endTime = null;
    this.fare = null;
    this.estimatedFare = estimatedFare;
    this.distance = distance;
    this.passengerRating = null;
    this.driverRating = null;
  }

  assignDriver(driver: Driver): void {
    this.driver = driver;
    this.status = RideStatus.DRIVER_ASSIGNED;
  }

  driverArrived(): void {
    this.status = RideStatus.DRIVER_ARRIVED;
  }

   startRide(): void {
    this.status = RideStatus.IN_PROGRESS;
    this.startTime = new Date();
  }

  completeRide(fareStrategy: FareCalculationStrategy): void {
    this.status = RideStatus.COMPLETED;
    this.endTime = new Date();

    // fare calculation
      if (this.driver) {
      this.fare = fareStrategy.calculateFare(this);
    }
  }

  cancelRide(): void {
    this.status = RideStatus.CANCELLED;
  }

  rateDriver(rating: number): void {
    this.driverRating = rating;
    if (this.driver) {
      this.driver.updateRating(rating);
    }
  }

  ratePassenger(rating: number): void {
    this.passengerRating = rating;
    this.passenger.updateRating(rating);
  }

  getStatus(): RideStatus {
    return this.status;
  }

  getEstimatedFare(): number {
    return this.estimatedFare;
  }

  getActualFare(): number | null {
    return this.fare;
  }

  getDistance(): number {
    return this.distance;
  }

  getRequestTime(): Date {
    return this.requestTime;
  }

  getStartTime(): Date | null {
    return this.startTime;
  }

  getEndTime(): Date | null {
    return this.endTime;
  }

  getDriver(): Driver | null {
    return this.driver;
  }

  getPassenger(): Passenger {
    return this.passenger;
  }

  getPickup(): GeoLocation {
    return this.pickup;
  }

  getDropoff(): GeoLocation {
    return this.dropoff;
  }
}

interface FareCalculationStrategy {
  calculateFare(ride: Ride): number;
}

// standard fare calculation
class StandardFareStrategy implements FareCalculationStrategy {
  private readonly BASE_FARE: number = 2.5;
  private readonly PER_KM_RATE: number = 1.5;
  private readonly PER_MINUTE_RATE: number = 0.25;

  calculateFare(ride: Ride): number {
    const distance = ride.getDistance();
    const startTime = ride.getStartTime();
    const endTime = ride.getEndTime();
    
    if (!startTime || !endTime) {
      return 0;
    }
    
    const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    
    const distanceFare = distance * this.PER_KM_RATE;
    const timeFare = durationInMinutes * this.PER_MINUTE_RATE;
    
    return this.BASE_FARE + distanceFare + timeFare;
  }
}

class PeakTimeFareStrategy implements FareCalculationStrategy {
  private readonly PEAK_MULTIPLIER: number = 1.5;
  private standardStrategy: StandardFareStrategy;
  
  constructor() {
    this.standardStrategy = new StandardFareStrategy();
  }
  
  calculateFare(ride: Ride): number {
    const standardFare = this.standardStrategy.calculateFare(ride);
    return standardFare * this.PEAK_MULTIPLIER;
  }
}

// Night time fare calculation.
class NightTimeFareStrategy implements FareCalculationStrategy {
  private readonly NIGHT_MULTIPLIER: number = 1.25;
  private standardStrategy: StandardFareStrategy;
  
  constructor() {
    this.standardStrategy = new StandardFareStrategy();
  }
  
  calculateFare(ride: Ride): number {
    const standardFare = this.standardStrategy.calculateFare(ride);
    return standardFare * this.NIGHT_MULTIPLIER;
  }
}

class DynamicPricingFactory {
  static createFareStrategy(currentTime: Date, trafficMultiplier: number): FareCalculationStrategy {
    const hour = currentTime.getHours();
    
    // Peak hours: 7-9 AM and 5-7 PM
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    
    // Night hours: 10 PM - 5 AM
    const isNightHour = hour >= 22 || hour <= 5;
    
    if (trafficMultiplier > 1.3 || isPeakHour) {
      return new PeakTimeFareStrategy();
    } else if (isNightHour) {
      return new NightTimeFareStrategy();
    } else {
      return new StandardFareStrategy();
    }
  }
}

class Vehicle {
  constructor(
    private id: string,
    private model: string,
    private licensePlate: string,
    private capacity: number,
    private type: "STANDARD" | "PREMIUM" | "XL"
  ) {}
  
  getId(): string {
    return this.id;
  }
  
  getModel(): string {
    return this.model;
  }
  
  getLicensePlate(): string {
    return this.licensePlate;
  }
  
  getCapacity(): number {
    return this.capacity;
  }
  
  getType(): string {
    return this.type;
  }
}

class VehicleManagementSystem {
  private vehicles: Map<string, Vehicle> = new Map();
  
  addVehicle(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.getId(), vehicle);
  }
  
  getVehicle(id: string): Vehicle | undefined {
    return this.vehicles.get(id);
  }
  
  updateVehicle(vehicle: Vehicle): boolean {
    if (this.vehicles.has(vehicle.getId())) {
      this.vehicles.set(vehicle.getId(), vehicle);
      return true;
    }
    return false;
  }
  
  removeVehicle(id: string): boolean {
    return this.vehicles.delete(id);
  }
}
// This is the pattern for how the factory created rides.
class RideFactory {
  static createRide(
    passenger: Passenger, 
    pickup: GeoLocation, 
    dropoff: GeoLocation
  ): Ride {

    const id = `RIDE-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
    const distance = this.calculateDistance(pickup, dropoff);
    const estimatedFare = this.calculateEstimatedFare(distance);
    return new Ride(id, passenger, pickup, dropoff, estimatedFare, distance);
  }

  private static calculateDistance(pickup: GeoLocation, dropoff: GeoLocation): number {
     const latDiff = pickup.latitude - dropoff.latitude;
    const lngDiff = pickup.longitude - dropoff.longitude;
     return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
  }
  
  private static calculateEstimatedFare(distance: number): number {
     const BASE_FARE = 2.5;
    const PER_KM_RATE = 1.5;
    return BASE_FARE + (distance * PER_KM_RATE);
  }
}

class DriverMatchingService {
  private availableDrivers: Driver[] = [];
  
  updateDriverLocation(driver: Driver, location: GeoLocation): void {
    driver.updateLocation(location);
  }
  
  addAvailableDriver(driver: Driver): void {
    if (driver.isDriverAvailable()) {
      this.availableDrivers.push(driver);
    }
  }
  
  removeAvailableDriver(driverId: string): void {
    this.availableDrivers = this.availableDrivers.filter(driver => driver.getId() !== driverId);
  }
  
  findNearestDriver(pickup: GeoLocation, maxDistance: number = 5): Driver | null {
    let nearestDriver: Driver | null = null;
    let shortestDistance = Number.MAX_VALUE;
    
    for (const driver of this.availableDrivers) {
      const driverLocation = driver.getCurrentLocation();
      const distance = this.calculateDistance(pickup, driverLocation);
      
      if (distance < shortestDistance && distance <= maxDistance) {
        shortestDistance = distance;
        nearestDriver = driver;
      }
    }
    
    return nearestDriver;
  }

  private calculateDistance(location1: GeoLocation, location2: GeoLocation): number {
    const latDiff = location1.latitude - location2.latitude;
    const lngDiff = location1.longitude - location2.longitude;
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
  }
}

class RatingService {
  rateRide(ride: Ride, passengerRating: number | null, driverRating: number | null): void {
    if (driverRating !== null) {
      ride.rateDriver(driverRating);
    }
    
    if (passengerRating !== null) {
      ride.ratePassenger(passengerRating);
    }
  }
  
  getUserRating(user: User): number {
    return user.getRating();
  }
}

class RideHistoryService {
  private rideHistory: Map<string, Ride[]> = new Map();
  
  addRideToHistory(userId: string, ride: Ride): void {
    const userRides = this.rideHistory.get(userId) || [];
    userRides.push(ride);
    this.rideHistory.set(userId, userRides);
  }
  
  getUserRideHistory(userId: string): Ride[] {
    return this.rideHistory.get(userId) || [];
  }
}

class AuthenticationService {
  private users: Map<string, User> = new Map();
  
  register(user: User): boolean {
    if (this.users.has(user.getId())) {
      return false;
    }
    
    this.users.set(user.getId(), user);
    return true;
  }
  
  login(email: string, password: string): User | null {
    for (const user of this.users.values()) {
      if (user instanceof User && user.getEmail() === email && user['password'] === password) {
        return user;
      }
    }
    return null;
  }
}

class RideSharingApp {
  private authService: AuthenticationService;
  private vehicleManagement: VehicleManagementSystem;
  private driverMatching: DriverMatchingService;
  private ratingService: RatingService;
  private rideHistoryService: RideHistoryService;
  
  constructor() {
    this.authService = new AuthenticationService();
    this.vehicleManagement = new VehicleManagementSystem();
    this.driverMatching = new DriverMatchingService();
    this.ratingService = new RatingService();
    this.rideHistoryService = new RideHistoryService();
  }
  
  registerUser(user: User): boolean {
    return this.authService.register(user);
  }
  
  loginUser(email: string, password: string): User | null {
    return this.authService.login(email, password);
  }
  
  updateDriverLocation(driver: Driver, location: GeoLocation): void {
    this.driverMatching.updateDriverLocation(driver, location);
  }
  
  setDriverAvailability(driver: Driver, isAvailable: boolean): void {
    driver.setAvailability(isAvailable);

    if (isAvailable) {
      this.driverMatching.addAvailableDriver(driver);
    } else {
      this.driverMatching.removeAvailableDriver(driver.getId());
    }
  }
  
  requestRide(passenger: Passenger, pickup: GeoLocation, dropoff: GeoLocation): Ride | null {
    const ride = RideFactory.createRide(passenger, pickup, dropoff);

    // Find the nearest driver.
    const driver = this.driverMatching.findNearestDriver(pickup);
    
    if (!driver) {
      return null; // No driver available.
    }

     ride.assignDriver(driver);
      this.driverMatching.removeAvailableDriver(driver.getId());
       return ride;
  }

  completeRide(ride: Ride): void {
    const currentTime = new Date();
    const trafficMultiplier = 1.0;
     const fareStrategy = DynamicPricingFactory.createFareStrategy(currentTime, trafficMultiplier);
      ride.completeRide(fareStrategy);

    //   Add to the ride history.
     const passengerId = ride.getPassenger().getId();
    this.rideHistoryService.addRideToHistory(passengerId, ride);
    
    const driver = ride.getDriver();
    if (driver) {
      this.rideHistoryService.addRideToHistory(driver.getId(), ride);
    }
  }
  
  rateRide(ride: Ride, passengerRating: number | null, driverRating: number | null): void {
    this.ratingService.rateRide(ride, passengerRating, driverRating);
  }
  
  getUserRideHistory(userId: string): Ride[] {
    return this.rideHistoryService.getUserRideHistory(userId);
  }
}

function demonstrateRideSharingApp(): void {
    const app = new RideSharingApp();
    
    // Register users
    const passenger = new Passenger("P1", "John Doe", "john@example.com", "1234567890", "pass123");
    const driver = new Driver(
        "D1",
        "Jane Smith",
        "jane@example.com",
        "0987654321",
        "driverpass123", // password
        "VEH123",        // vehicleId
        "LIC456",        // licenseNumber
        true,            // isAvailable
        { latitude: 40.7130, longitude: -74.0070 } // currentLocation
    );

    app.registerUser(passenger);
    app.registerUser(driver);
    app.setDriverAvailability(driver, true);

    console.log("Passenger Info:");
    console.log(passenger);
    console.log("Driver Info:");
    console.log(driver);

    const pickupLocation = { latitude: 37.7739, longitude: -122.4312 };
  const dropoffLocation = { latitude: 37.7925, longitude: -122.4382 };
  
  const ride = app.requestRide(passenger, pickupLocation, dropoffLocation);
  
  if (ride) {
    console.log(`Ride requested from (${pickupLocation.latitude}, ${pickupLocation.longitude}) to (${dropoffLocation.latitude}, ${dropoffLocation.longitude})`);
    console.log(`Estimated fare: $${ride.getEstimatedFare().toFixed(2)}`);
    console.log(`Assigned driver: ${ride.getDriver()?.getName()}`);

     ride.driverArrived();
    console.log("Driver has arrived at pickup location");
    ride.startRide();
    console.log("Ride started");

    // Simulate ride completion
    app.completeRide(ride);
    console.log("Ride has been completed");
    console.log(`Actual fare: $${ride.getActualFare()?.toFixed(2)}`);

    // Rate the ride
    app.rateRide(ride, 4.5, 5.0);
       console.log(`Passenger rated driver: ${ride.getDriver()?.getRating()}`);
    console.log(`Driver rated passenger: ${passenger.getRating()}`)

    // check ride history
     const passengerRideHistory = app.getUserRideHistory(passenger.getId());
    console.log(`Passenger has ${passengerRideHistory.length} rides in history`);
  } else {
    console.log("No drivers available nearby");
  }
}

demonstrateRideSharingApp();








    



    // // Register drivers
    // app.registerDriver(driver);
    
    // // Register passengers
    // app.registerPassenger(passenger);
    
    // // Request a ride
    // const pickup = new GeoLocation(40.7128, -74.0060);
    // const dropoff = new GeoLocation(34.0522, -118







    










