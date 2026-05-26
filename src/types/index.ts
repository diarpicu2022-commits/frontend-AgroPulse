// ── Domain enums ──────────────────────────────────────────────────────────────
export type SensorType =
  | 'TEMPERATURE'
  | 'TEMPERATURE_INTERNAL'
  | 'TEMPERATURE_EXTERNAL'
  | 'HUMIDITY'
  | 'HUMIDITY_EXTERNAL'
  | 'SOIL_MOISTURE'
  | 'LIGHT'
  | 'CO2'
  | 'PRESSURE'

export type ActuatorType = 'PUMP' | 'FAN' | 'LED' | 'SERVO' | 'RELAY' | 'MOTOR'

export type Protocol = 'DHT22' | 'DHT11' | 'ADC' | 'ANALOG' | 'I2C' | 'DIGITAL' | 'ONE_WIRE'

export type UserRole = 'ADMIN' | 'admin' | 'USER' | 'user'

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL'

export type RuleConditionType = 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'NOT_EQUALS'

export type RuleActionType = 'ACTIVATE' | 'DEACTIVATE' | 'ALERT'

// ── DTOs (raw from backend) ───────────────────────────────────────────────────
export interface GreenhouseDto {
  id: number
  name: string
  location?: string
  description?: string
  active: boolean
  deviceId?: string
  latitude?: number | null
  longitude?: number | null
  photoUrl?: string | null
}

export interface SensorDto {
  id: number
  name: string
  type: SensorType
  protocol?: Protocol
  gpioPin?: number | null
  active: boolean
  greenhouseId?: number
  deviceSource?: string
  location?: string
}

export interface ActuatorDto {
  id: number
  name: string
  type?: ActuatorType
  gpioPin?: number | null
  active: boolean
  status?: boolean
  activeLow?: boolean
  greenhouseId?: number
  deviceSource?: string
}

export interface SensorReadingDto {
  id: number
  sensorId: number
  sensorType?: SensorType
  value: number
  timestamp: string
  greenhouseId?: number
}

export type CropStage = 'SEEDING' | 'GROWING' | 'FLOWERING' | 'HARVESTING' | 'DORMANT'

export interface CropDto {
  id: number
  name: string
  variety?: string
  active: boolean | number
  greenhouseId?: number
  temp_min?: number
  temp_max?: number
  humidity_min?: number
  humidity_max?: number
  soil_moisture_min?: number
  soil_moisture_max?: number
  light_min?: number
  light_max?: number
  co2_min?: number
  co2_max?: number
  description?: string
  plantingDate?: string
  currentStage?: CropStage
}

export interface AlertDto {
  id: number
  type: SensorType | string
  level: AlertLevel
  title?: string
  message: string
  timestamp?: string
  read?: boolean
  greenhouseId?: number
}

export interface UserDto {
  id: number
  username?: string
  email?: string
  full_name?: string
  fullName?: string
  role: UserRole
  active?: boolean
  avatar?: string | null
  provider?: string
  googleId?: string
  greenhouseIds?: number[]
  token?: string
}

export interface RuleDto {
  id: number
  name: string
  sensorType: SensorType
  conditionType: RuleConditionType
  threshold: number
  actuatorId: number
  actionType: RuleActionType
  active: boolean
}

export interface LogDto {
  id: number
  action: string
  details?: string
  timestamp: string
  userId?: number
}

export interface ReportDto {
  id: number
  type: string
  createdAt: string
  fileUrl?: string
}

export interface TicketDto {
  id: number
  subject: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  createdAt: string
  updatedAt?: string
  userId?: number
}

export interface DeviceConfigDto {
  deviceId?: string
  sensors: SensorDto[]
  actuators: ActuatorDto[]
}

export interface GpioOptionsDto {
  usedGpios: number[]
  availableForSensors: number[]
  availableForActuators: number[]
}

// ── App-level models ──────────────────────────────────────────────────────────
export interface AppUser extends UserDto {
  provider?: string
  avatar?: string | null
}

export interface AutoAlert {
  type: SensorType
  title: string
  message: string
  timestamp: Date
}

export interface SensorMeta {
  label: string
  unit: string
  icon: unknown
  color: string
}

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total?: number
  page?: number
  limit?: number
}

// ── API list response wrappers ────────────────────────────────────────────────
export interface GreenhouseListResponse  { greenhouses: GreenhouseDto[] }
export interface SensorListResponse      { sensors: SensorDto[] }
export interface ActuatorListResponse    { actuators: ActuatorDto[] }
export interface ReadingListResponse     { readings: SensorReadingDto[] }
export interface CropListResponse        { crops: CropDto[] }
export interface AlertListResponse       { alerts: AlertDto[] }
export interface UserListResponse        { users: UserDto[] }
export interface RuleListResponse        { rules: RuleDto[] }
export interface LogListResponse         { logs: LogDto[] }
export interface TicketListResponse      { tickets: TicketDto[] }

export interface SensorThresholdDto {
  id?: number
  sensorId: number
  minValue?: number | null
  maxValue?: number | null
  noDataMinutes: number
  stuckMinutes: number
  spikePercent: number
  active?: boolean
}

export interface AlertRecipient {
  id: number
  greenhouseId: number
  name: string
  email?: string
  phone?: string
  callmebotApikey?: string
  active: boolean
}
