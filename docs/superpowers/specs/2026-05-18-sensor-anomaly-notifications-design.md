# Sensor Anomaly Detection & Multi-Channel Notifications — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Detectar automáticamente lecturas anómalas de sensores (fuera de rango, sin datos, valor constante, spike) y notificar a destinatarios configurados por invernadero vía email (SendGrid) y WhatsApp (CallMeBot), operando 24/7 sin intervención del usuario.

**Architecture:** Backend Spring Boot con `@Scheduled` job cada 2 minutos que evalúa todos los sensores activos con umbrales configurados. Al detectar anomalía nueva, inserta alerta en BD y dispara notificaciones. Frontend agrega configuración de umbrales en SensorsPage y gestión de destinatarios en GreenhousePage.

**Tech Stack:** Spring Boot (backend), React + TypeScript (frontend), PostgreSQL/Supabase, SendGrid Java SDK, CallMeBot HTTP API, anime.js.

---

## 1. Modelo de Datos (Backend)

### Tabla `sensor_thresholds`
```sql
CREATE TABLE sensor_thresholds (
  id              SERIAL PRIMARY KEY,
  sensor_id       INTEGER NOT NULL UNIQUE REFERENCES sensors(id) ON DELETE CASCADE,
  min_value       DOUBLE PRECISION,
  max_value       DOUBLE PRECISION,
  no_data_minutes INTEGER NOT NULL DEFAULT 10,
  stuck_minutes   INTEGER NOT NULL DEFAULT 30,
  spike_percent   DOUBLE PRECISION NOT NULL DEFAULT 50.0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Tabla `alert_recipients`
```sql
CREATE TABLE alert_recipients (
  id                  SERIAL PRIMARY KEY,
  greenhouse_id       INTEGER NOT NULL REFERENCES greenhouses(id) ON DELETE CASCADE,
  name                VARCHAR(120) NOT NULL,
  email               VARCHAR(255),
  phone               VARCHAR(30),
  callmebot_apikey    VARCHAR(60),
  active              BOOLEAN NOT NULL DEFAULT TRUE
);
```

### Tabla `sensor_anomalies`
```sql
CREATE TABLE sensor_anomalies (
  id            SERIAL PRIMARY KEY,
  sensor_id     INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  anomaly_type  VARCHAR(20) NOT NULL,  -- OUT_OF_RANGE | NO_DATA | STUCK | SPIKE
  detected_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMP,
  notified      BOOLEAN NOT NULL DEFAULT FALSE,
  value_at_detection DOUBLE PRECISION,
  message       TEXT
);
```

---

## 2. Entidades JPA y Repositorios (Backend)

### `SensorThreshold.java`
- Campos: `id`, `sensorId`, `minValue`, `maxValue`, `noDataMinutes` (default 10), `stuckMinutes` (default 30), `spikePercent` (default 50.0), `active`, `updatedAt`
- Anotación `@Entity @Table(name = "sensor_thresholds")`

### `AlertRecipient.java`
- Campos: `id`, `greenhouseId`, `name`, `email`, `phone`, `callmebotApikey`, `active`
- Anotación `@Entity @Table(name = "alert_recipients")`

### `SensorAnomaly.java`
- Campos: `id`, `sensorId`, `anomalyType` (String), `detectedAt`, `resolvedAt`, `notified`, `valueAtDetection`, `message`
- Anotación `@Entity @Table(name = "sensor_anomalies")`

### Repositorios JPA
- `SensorThresholdRepository`: `findBySensorId(int sensorId)`, `findBySensorIdAndActiveTrue(int sensorId)`
- `AlertRecipientRepository`: `findByGreenhouseIdAndActiveTrue(int greenhouseId)`
- `SensorAnomalyRepository`: `findBySensorIdAndAnomalyTypeAndResolvedAtIsNull(int sensorId, String type)`, `findBySensorIdAndNotifiedFalse()`

---

## 3. Controladores REST (Backend)

### `SensorThresholdController` — `/sensors/{sensorId}/threshold`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET    | `/sensors/{id}/threshold` | Obtener umbral del sensor (404 si no existe) |
| PUT    | `/sensors/{id}/threshold` | Crear o actualizar umbral (upsert) |
| DELETE | `/sensors/{id}/threshold` | Eliminar umbral |

Body del PUT:
```json
{
  "minValue": 15.0,
  "maxValue": 35.0,
  "noDataMinutes": 10,
  "stuckMinutes": 30,
  "spikePercent": 50.0
}
```

### `AlertRecipientController` — `/greenhouses/{id}/alert-recipients`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET    | `/greenhouses/{id}/alert-recipients` | Listar destinatarios del invernadero |
| POST   | `/greenhouses/{id}/alert-recipients` | Agregar destinatario |
| DELETE | `/greenhouses/{id}/alert-recipients/{recipientId}` | Eliminar destinatario |

Body del POST:
```json
{
  "name": "Carlos Díaz",
  "email": "carlos@example.com",
  "phone": "+573001234567",
  "callmebotApikey": "123456"
}
```

---

## 4. Lógica de Detección de Anomalías (Backend)

### `AnomalyDetectionService.java`

Anotado con `@Service`. Método principal anotado con `@Scheduled(fixedDelay = 120_000)`.

**Algoritmo por sensor:**

```
Para cada sensor activo con threshold configurado:
  1. Obtener threshold del sensor
  2. Obtener lecturas recientes (últimas 10, ordenadas por timestamp DESC)
  3. Evaluar 4 condiciones:

  A. OUT_OF_RANGE:
     Si ultima_lectura.value < threshold.minValue (si minValue != null)
     O ultima_lectura.value > threshold.maxValue (si maxValue != null)
     → anomalia = OUT_OF_RANGE

  B. NO_DATA:
     Si no hay lecturas en los últimos threshold.noDataMinutes minutos
     O el sensor nunca ha reportado datos
     → anomalia = NO_DATA

  C. STUCK:
     Si todas las lecturas en los últimos threshold.stuckMinutes minutos
     tienen valor con variación < 0.01 (tolerancia flotación)
     Y hay al menos 3 lecturas en ese período
     → anomalia = STUCK

  D. SPIKE:
     Si |lectura[0].value - lectura[1].value| / |lectura[1].value| > spikePercent/100
     Y lectura[1].value != 0
     → anomalia = SPIKE

  4. Para cada tipo de anomalía detectada:
     a. Buscar anomalía activa existente del mismo tipo (resolvedAt IS NULL)
     b. Si NO existe → crear nueva SensorAnomaly, notified=false
     c. Si SÍ existe → no crear duplicado

  5. Resolver anomalías que ya no aplican:
     Para cada anomalía activa del sensor, si la condición ya no se cumple
     → setResolvedAt(NOW())

  6. Enviar notificaciones:
     Para cada SensorAnomaly con notified=false:
     → cargar destinatarios del invernadero del sensor
     → llamar NotificationService
     → setNotified(true)
```

**Dependencias:** `SensorRepository`, `SensorReadingRepository` (o JdbcTemplate para lecturas), `SensorThresholdRepository`, `SensorAnomalyRepository`, `AlertRecipientRepository`, `NotificationService`

---

## 5. Servicio de Notificaciones (Backend)

### `NotificationService.java`

Variables de entorno requeridas:
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL` (email remitente verificado en SendGrid)

#### Método `sendEmail(AlertRecipient recipient, SensorAnomaly anomaly, String sensorName, String greenhouseName)`

Dependencia Maven:
```xml
<dependency>
  <groupId>com.sendgrid</groupId>
  <artifactId>sendgrid-java</artifactId>
  <version>4.10.2</version>
</dependency>
```

Asunto: `[AgroPulse] ⚠️ Anomalía: {anomaly.anomalyType} — Sensor "{sensorName}"`

Cuerpo HTML:
```html
<h2>⚠️ Alerta de Sensor — AgroPulse</h2>
<p><b>Invernadero:</b> {greenhouseName}</p>
<p><b>Sensor:</b> {sensorName}</p>
<p><b>Tipo de anomalía:</b> {anomalyType en español}</p>
<p><b>Valor detectado:</b> {valueAtDetection}</p>
<p><b>Hora:</b> {detectedAt}</p>
<p><b>Mensaje:</b> {message}</p>
```

Si SendGrid falla → loguear error, continuar con WhatsApp.

#### Método `sendWhatsApp(AlertRecipient recipient, SensorAnomaly anomaly, String sensorName, String greenhouseName)`

URL: `https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_text}&apikey={apikey}`

Solo se llama si `recipient.phone != null && recipient.callmebotApikey != null`.

Texto (max ~160 chars, URL-encoded):
```
⚠️ AgroPulse: {anomalyType} en "{sensorName}" ({greenhouseName}). Valor: {value}. {timestamp}
```

Llamada HTTP via `java.net.http.HttpClient` (Java 11+). Si falla → loguear, continuar.

#### Método público `notifyAnomaly(SensorAnomaly anomaly, int greenhouseId, String sensorName, String greenhouseName)`
- Carga `List<AlertRecipient>` del invernadero
- Para cada recipient activo: llama `sendEmail` (si tiene email) y `sendWhatsApp` (si tiene phone + apikey)
- Si no hay destinatarios → solo loguea, no lanza excepción

---

## 6. Frontend — SensorsPage: Configuración de Umbrales

### Cambios en `src/pages/SensorsPage.tsx`

**Estado nuevo:**
```typescript
interface ThresholdForm {
  minValue: string
  maxValue: string
  noDataMinutes: string
  stuckMinutes: string
  spikePercent: string
}
const [expandedThreshold, setExpandedThreshold] = useState<number | null>(null)
const [thresholds, setThresholds] = useState<Record<number, ThresholdForm>>({})
const [savingThreshold, setSavingThreshold] = useState<number | null>(null)
```

**Al cargar la lista de sensores:** para cada sensor, hacer `GET /sensors/{id}/threshold` y popular `thresholds[sensorId]`.

**UI por sensor:** después del badge de tipo/protocolo actual, agregar:
- Badge `✓ Umbrales` (verde, badge-green) si el sensor tiene threshold configurado
- Botón `⚙️ Umbrales` que togglea `expandedThreshold === sensor.id`

**Panel expandible de umbral** (animado con anime.js, `translateY [-8,0] opacity [0,1]`):
```
┌─────────────────────────────────────────┐
│ Valor mínimo    [____]  Valor máximo [____] │
│ Sin datos tras  [10] min  Constante tras [30] min │
│ Spike máximo    [50] %                       │
│              [Guardar umbrales]              │
└─────────────────────────────────────────┘
```
Todos los campos dark-themed (`input-field` style). Botón llama `PUT /sensors/{id}/threshold`.

**Nuevo helper en repositorio:** `sensorRepository.getThreshold(id)`, `sensorRepository.setThreshold(id, data)`.

---

## 7. Frontend — GreenhousePage: Pestaña Notificaciones

### Cambios en `src/pages/GreenhousePage.tsx`

**Tipo de tab actualizado:**
```typescript
type GhTab = 'users' | 'device' | 'alerts'
```

**Estado nuevo:**
```typescript
const [ghRecipients, setGhRecipients] = useState<Record<number, AlertRecipient[]>>({})
interface RecipientForm { name: string; email: string; phone: string; callmebotApikey: string }
const [recipientForm, setRecipientForm] = useState<RecipientForm>({ name: '', email: '', phone: '+57', callmebotApikey: '' })
```

**Botón nuevo** junto a "Usuarios" y "Dispositivo":
```tsx
<button onClick={() => toggleTab(g.id, 'alerts')} ...>
  🔔 Alertas
</button>
```

**Panel de Alertas:**
- Título: `🔔 Destinatarios de alertas`
- Lista de recipients con: inicial/nombre, badges `📧` y `💬`, botón Quitar
- Formulario: Nombre*, Email, Teléfono (placeholder `+573001234567`), CallMeBot API Key
- Link de texto pequeño: `¿Cómo obtener mi API Key de CallMeBot?` → abre `https://www.callmebot.com/blog/free-api-whatsapp-messages/` en nueva tab
- Botón `+ Agregar destinatario`

**Nuevo tipo `AlertRecipient` en `src/types.ts`:**
```typescript
export interface AlertRecipient {
  id: number
  greenhouseId: number
  name: string
  email?: string
  phone?: string
  callmebotApikey?: string
  active: boolean
}
```

**Nuevos métodos en `greenhouseRepository`:**
- `listRecipients(greenhouseId)` → `GET /greenhouses/{id}/alert-recipients`
- `addRecipient(greenhouseId, data)` → `POST /greenhouses/{id}/alert-recipients`
- `removeRecipient(greenhouseId, recipientId)` → `DELETE /greenhouses/{id}/alert-recipients/{recipientId}`

---

## 8. Integración con AlertsPage

El scheduler inserta anomalías detectadas también en la tabla `alerts` existente (o la entidad `Alert` JPA) con:
- `level = "CRITICAL"` para OUT_OF_RANGE y NO_DATA
- `level = "WARNING"` para STUCK y SPIKE
- `message` descriptivo en español
- `greenhouseId` del sensor afectado

Esto permite que **AlertsPage** muestre las anomalías sin cambios estructurales. Se agrega solo un badge visual `badge-red SENSOR` en el frontend si el alert tiene un `sensorId` en su payload.

---

## 9. Variables de Entorno Requeridas (Render)

| Variable | Descripción |
|----------|-------------|
| `SENDGRID_API_KEY` | API key de SendGrid |
| `SENDGRID_FROM_EMAIL` | Email remitente verificado en SendGrid |

CallMeBot no requiere API key del servidor — la key es por destinatario individual.

---

## 10. Flujo Completo de Usuario

```
Admin → SensorsPage → abre ⚙️ Umbrales del sensor → configura min/max/tiempos → Guardar
Admin → GreenhousePage → pestaña 🔔 Alertas → agrega destinatario (nombre + email + phone + apikey)
ESP32 envía lecturas → backend almacena en sensor_readings
Cada 2 min: scheduler revisa todos los sensores con umbrales →
  Si anomalía nueva → inserta en sensor_anomalies + inserta en alerts →
  NotificationService → SendGrid email + CallMeBot WhatsApp a todos los destinatarios del invernadero
AlertsPage muestra las anomalías en tiempo real (polling/refresh existente)
```
