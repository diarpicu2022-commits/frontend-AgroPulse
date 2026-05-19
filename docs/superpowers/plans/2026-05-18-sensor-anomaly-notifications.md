# Sensor Anomaly Detection & Multi-Channel Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detectar anomalías en sensores (fuera de rango, sin datos, valor constante, spike) y notificar destinatarios configurados por invernadero vía email (SendGrid) y WhatsApp (CallMeBot), con un job Spring Boot cada 2 minutos.

**Architecture:** Backend Spring Boot scheduler (`@Scheduled`) evalúa todos los sensores con umbrales configurados cada 2 min. Las anomalías se almacenan en `sensor_anomalies` y se insertan en `alerts` para el frontend. `NotificationService` envía email vía SendGrid y WhatsApp vía CallMeBot HTTP GET. Frontend agrega UI de umbrales en SensorsPage y gestión de destinatarios en GreenhousePage.

**Tech Stack:** Spring Boot 3.2.5, JPA/Hibernate (PostgreSQL), SendGrid Java SDK 4.10.2, CallMeBot HTTP API, React 18 + TypeScript, anime.js.

---

## File Structure

**Backend — New files:**
- `com/agropulse/model/SensorThreshold.java`
- `com/agropulse/model/AlertRecipient.java`
- `com/agropulse/model/SensorAnomaly.java`
- `com/agropulse/dao/SensorThresholdRepository.java`
- `com/agropulse/dao/AlertRecipientRepository.java`
- `com/agropulse/dao/SensorAnomalyRepository.java`
- `com/agropulse/api/SensorThresholdController.java`
- `com/agropulse/api/AlertRecipientController.java`
- `com/agropulse/service/NotificationService.java`
- `com/agropulse/service/AnomalyDetectionService.java`

**Backend — Modified files:**
- `pom.xml` — add sendgrid-java dependency
- `com/agropulse/AgroPulseApplication.java` — add `@EnableScheduling`

**Frontend — Modified files:**
- `src/types.ts` — add `AlertRecipient`, `SensorThresholdDto`
- `src/repositories/SensorRepository.ts` — add threshold CRUD methods
- `src/repositories/GreenhouseRepository.ts` — add recipient CRUD methods
- `src/pages/SensorsPage.tsx` — add threshold UI per sensor card
- `src/pages/GreenhousePage.tsx` — add `'alerts'` tab with recipient management

---

### Task 1: Backend — pom.xml dependency + `@EnableScheduling`

**Files:**
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\pom.xml`
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\AgroPulseApplication.java`

- [ ] **Step 1: Add SendGrid dependency to pom.xml**

Inside `<dependencies>`, after the last existing `<dependency>` block:
```xml
<dependency>
    <groupId>com.sendgrid</groupId>
    <artifactId>sendgrid-java</artifactId>
    <version>4.10.2</version>
</dependency>
```

- [ ] **Step 2: Add `@EnableScheduling` to AgroPulseApplication.java**

Replace the class declaration:
```java
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
@EnableScheduling
public class AgroPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgroPulseApplication.class, args);
    }
}
```

- [ ] **Step 3: Verify compilation**

Run from the backend directory:
```
mvn compile -q
```
Expected: no output (success). If errors appear, check that the sendgrid-java artifact is available via Maven Central.

- [ ] **Step 4: Commit**
```bash
git add "backend AgroPulse/pom.xml" "backend AgroPulse/src/main/java/com/agropulse/AgroPulseApplication.java"
git commit -m "feat: add SendGrid dependency and enable Spring scheduling"
```

---

### Task 2: Backend — SensorThreshold entity + repository

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\model\SensorThreshold.java`
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\dao\SensorThresholdRepository.java`

- [ ] **Step 1: Create SensorThreshold.java**

```java
package com.agropulse.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_thresholds")
public class SensorThreshold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "sensor_id", nullable = false, unique = true)
    private int sensorId;

    @Column(name = "min_value")
    private Double minValue;

    @Column(name = "max_value")
    private Double maxValue;

    @Column(name = "no_data_minutes", nullable = false)
    private int noDataMinutes = 10;

    @Column(name = "stuck_minutes", nullable = false)
    private int stuckMinutes = 30;

    @Column(name = "spike_percent", nullable = false)
    private double spikePercent = 50.0;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public int getId()                           { return id; }
    public void setId(int id)                    { this.id = id; }
    public int getSensorId()                     { return sensorId; }
    public void setSensorId(int v)               { this.sensorId = v; }
    public Double getMinValue()                  { return minValue; }
    public void setMinValue(Double v)            { this.minValue = v; }
    public Double getMaxValue()                  { return maxValue; }
    public void setMaxValue(Double v)            { this.maxValue = v; }
    public int getNoDataMinutes()                { return noDataMinutes; }
    public void setNoDataMinutes(int v)          { this.noDataMinutes = v; }
    public int getStuckMinutes()                 { return stuckMinutes; }
    public void setStuckMinutes(int v)           { this.stuckMinutes = v; }
    public double getSpikePercent()              { return spikePercent; }
    public void setSpikePercent(double v)        { this.spikePercent = v; }
    public boolean isActive()                    { return active; }
    public void setActive(boolean v)             { this.active = v; }
    public LocalDateTime getUpdatedAt()          { return updatedAt; }
    public void setUpdatedAt(LocalDateTime v)    { this.updatedAt = v; }
}
```

- [ ] **Step 2: Create SensorThresholdRepository.java**

```java
package com.agropulse.dao;

import com.agropulse.model.SensorThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SensorThresholdRepository extends JpaRepository<SensorThreshold, Integer> {
    Optional<SensorThreshold> findBySensorId(int sensorId);
    List<SensorThreshold> findByActiveTrue();
    void deleteBySensorId(int sensorId);
}
```

- [ ] **Step 3: Verify compilation**
```
mvn compile -q
```
Expected: success, no output.

- [ ] **Step 4: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/model/SensorThreshold.java" \
        "backend AgroPulse/src/main/java/com/agropulse/dao/SensorThresholdRepository.java"
git commit -m "feat: add SensorThreshold entity and repository"
```

---

### Task 3: Backend — AlertRecipient entity + repository

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\model\AlertRecipient.java`
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\dao\AlertRecipientRepository.java`

- [ ] **Step 1: Create AlertRecipient.java**

```java
package com.agropulse.model;

import jakarta.persistence.*;

@Entity
@Table(name = "alert_recipients")
public class AlertRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "greenhouse_id", nullable = false)
    private int greenhouseId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 255)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "callmebot_apikey", length = 60)
    private String callmebotApikey;

    @Column(nullable = false)
    private boolean active = true;

    public int getId()                         { return id; }
    public void setId(int id)                  { this.id = id; }
    public int getGreenhouseId()               { return greenhouseId; }
    public void setGreenhouseId(int v)         { this.greenhouseId = v; }
    public String getName()                    { return name; }
    public void setName(String v)              { this.name = v; }
    public String getEmail()                   { return email; }
    public void setEmail(String v)             { this.email = v; }
    public String getPhone()                   { return phone; }
    public void setPhone(String v)             { this.phone = v; }
    public String getCallmebotApikey()         { return callmebotApikey; }
    public void setCallmebotApikey(String v)   { this.callmebotApikey = v; }
    public boolean isActive()                  { return active; }
    public void setActive(boolean v)           { this.active = v; }
}
```

- [ ] **Step 2: Create AlertRecipientRepository.java**

```java
package com.agropulse.dao;

import com.agropulse.model.AlertRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRecipientRepository extends JpaRepository<AlertRecipient, Integer> {
    List<AlertRecipient> findByGreenhouseIdAndActiveTrue(int greenhouseId);
    List<AlertRecipient> findByGreenhouseId(int greenhouseId);
}
```

- [ ] **Step 3: Verify compilation**
```
mvn compile -q
```
Expected: success.

- [ ] **Step 4: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/model/AlertRecipient.java" \
        "backend AgroPulse/src/main/java/com/agropulse/dao/AlertRecipientRepository.java"
git commit -m "feat: add AlertRecipient entity and repository"
```

---

### Task 4: Backend — SensorAnomaly entity + repository

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\model\SensorAnomaly.java`
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\dao\SensorAnomalyRepository.java`

- [ ] **Step 1: Create SensorAnomaly.java**

```java
package com.agropulse.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_anomalies")
public class SensorAnomaly {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "sensor_id", nullable = false)
    private int sensorId;

    // Values: OUT_OF_RANGE | NO_DATA | STUCK | SPIKE
    @Column(name = "anomaly_type", nullable = false, length = 20)
    private String anomalyType;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(nullable = false)
    private boolean notified = false;

    @Column(name = "value_at_detection")
    private Double valueAtDetection;

    @Column(columnDefinition = "TEXT")
    private String message;

    public int getId()                             { return id; }
    public void setId(int id)                      { this.id = id; }
    public int getSensorId()                       { return sensorId; }
    public void setSensorId(int v)                 { this.sensorId = v; }
    public String getAnomalyType()                 { return anomalyType; }
    public void setAnomalyType(String v)           { this.anomalyType = v; }
    public LocalDateTime getDetectedAt()           { return detectedAt; }
    public void setDetectedAt(LocalDateTime v)     { this.detectedAt = v; }
    public LocalDateTime getResolvedAt()           { return resolvedAt; }
    public void setResolvedAt(LocalDateTime v)     { this.resolvedAt = v; }
    public boolean isNotified()                    { return notified; }
    public void setNotified(boolean v)             { this.notified = v; }
    public Double getValueAtDetection()            { return valueAtDetection; }
    public void setValueAtDetection(Double v)      { this.valueAtDetection = v; }
    public String getMessage()                     { return message; }
    public void setMessage(String v)               { this.message = v; }
}
```

- [ ] **Step 2: Create SensorAnomalyRepository.java**

```java
package com.agropulse.dao;

import com.agropulse.model.SensorAnomaly;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SensorAnomalyRepository extends JpaRepository<SensorAnomaly, Integer> {
    Optional<SensorAnomaly> findBySensorIdAndAnomalyTypeAndResolvedAtIsNull(int sensorId, String anomalyType);
    List<SensorAnomaly> findByNotifiedFalse();
    List<SensorAnomaly> findBySensorId(int sensorId);
}
```

- [ ] **Step 3: Verify compilation**
```
mvn compile -q
```
Expected: success.

- [ ] **Step 4: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/model/SensorAnomaly.java" \
        "backend AgroPulse/src/main/java/com/agropulse/dao/SensorAnomalyRepository.java"
git commit -m "feat: add SensorAnomaly entity and repository"
```

---

### Task 5: Backend — SensorThresholdController

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\api\SensorThresholdController.java`

- [ ] **Step 1: Create SensorThresholdController.java**

Note: No class-level `@RequestMapping` — full paths are in each method to avoid conflict with `SensorController`.

```java
package com.agropulse.api;

import com.agropulse.dao.SensorThresholdRepository;
import com.agropulse.model.SensorThreshold;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
public class SensorThresholdController {

    @Autowired
    private SensorThresholdRepository thresholdRepository;

    // GET /sensors/{id}/threshold
    @GetMapping("/sensors/{id}/threshold")
    public ResponseEntity<?> getThreshold(@PathVariable int id) {
        Optional<SensorThreshold> opt = thresholdRepository.findBySensorId(id);
        return opt.<ResponseEntity<?>>map(ResponseEntity::ok)
                  .orElse(ResponseEntity.notFound().build());
    }

    // PUT /sensors/{id}/threshold  (upsert)
    @PutMapping("/sensors/{id}/threshold")
    public ResponseEntity<?> setThreshold(@PathVariable int id,
                                          @RequestBody Map<String, Object> body) {
        SensorThreshold t = thresholdRepository.findBySensorId(id)
                                               .orElse(new SensorThreshold());
        t.setSensorId(id);
        if (body.containsKey("minValue"))      t.setMinValue(toDoubleNullable(body.get("minValue")));
        if (body.containsKey("maxValue"))      t.setMaxValue(toDoubleNullable(body.get("maxValue")));
        if (body.containsKey("noDataMinutes")) t.setNoDataMinutes(toInt(body.get("noDataMinutes")));
        if (body.containsKey("stuckMinutes"))  t.setStuckMinutes(toInt(body.get("stuckMinutes")));
        if (body.containsKey("spikePercent"))  t.setSpikePercent(toDouble(body.get("spikePercent")));
        t.setActive(true);
        t.setUpdatedAt(LocalDateTime.now());
        thresholdRepository.save(t);
        return ResponseEntity.ok(t);
    }

    // DELETE /sensors/{id}/threshold
    @DeleteMapping("/sensors/{id}/threshold")
    public ResponseEntity<?> deleteThreshold(@PathVariable int id) {
        thresholdRepository.findBySensorId(id)
                           .ifPresent(t -> thresholdRepository.delete(t));
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    private int toInt(Object v) {
        if (v instanceof Integer) return (Integer) v;
        if (v instanceof Long)    return ((Long) v).intValue();
        if (v instanceof Double)  return ((Double) v).intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return 0; }
    }
    private double toDouble(Object v) {
        if (v instanceof Double)  return (Double) v;
        if (v instanceof Integer) return ((Integer) v).doubleValue();
        if (v instanceof Long)    return ((Long) v).doubleValue();
        try { return Double.parseDouble(v.toString()); } catch (Exception e) { return 0.0; }
    }
    private Double toDoubleNullable(Object v) {
        if (v == null) return null;
        return toDouble(v);
    }
}
```

- [ ] **Step 2: Verify compilation**
```
mvn compile -q
```
Expected: success.

- [ ] **Step 3: Test manually (optional, after backend starts)**

```bash
# Create threshold for sensor 1
curl -X PUT http://localhost:8080/sensors/1/threshold \
  -H "Content-Type: application/json" \
  -d '{"minValue":10.0,"maxValue":40.0,"noDataMinutes":10,"stuckMinutes":30,"spikePercent":50}'

# Expected: JSON with SensorThreshold object including id, sensorId=1, minValue=10.0

# Get threshold
curl http://localhost:8080/sensors/1/threshold
# Expected: same JSON

# Delete threshold
curl -X DELETE http://localhost:8080/sensors/1/threshold
# Expected: {"deleted":true}
```

- [ ] **Step 4: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/api/SensorThresholdController.java"
git commit -m "feat: add SensorThresholdController with GET/PUT/DELETE /sensors/{id}/threshold"
```

---

### Task 6: Backend — AlertRecipientController

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\api\AlertRecipientController.java`

- [ ] **Step 1: Create AlertRecipientController.java**

```java
package com.agropulse.api;

import com.agropulse.dao.AlertRecipientRepository;
import com.agropulse.model.AlertRecipient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
public class AlertRecipientController {

    @Autowired
    private AlertRecipientRepository recipientRepository;

    // GET /greenhouses/{id}/alert-recipients
    @GetMapping("/greenhouses/{id}/alert-recipients")
    public ResponseEntity<?> list(@PathVariable int id) {
        List<AlertRecipient> list = recipientRepository.findByGreenhouseId(id);
        return ResponseEntity.ok(Map.of("recipients", list));
    }

    // POST /greenhouses/{id}/alert-recipients
    @PostMapping("/greenhouses/{id}/alert-recipients")
    public ResponseEntity<?> create(@PathVariable int id,
                                    @RequestBody Map<String, Object> body) {
        AlertRecipient r = new AlertRecipient();
        r.setGreenhouseId(id);
        if (body.containsKey("name"))             r.setName((String) body.get("name"));
        if (body.containsKey("email"))            r.setEmail((String) body.get("email"));
        if (body.containsKey("phone"))            r.setPhone((String) body.get("phone"));
        if (body.containsKey("callmebotApikey"))  r.setCallmebotApikey((String) body.get("callmebotApikey"));
        r.setActive(true);
        recipientRepository.save(r);
        return ResponseEntity.ok(r);
    }

    // DELETE /greenhouses/{id}/alert-recipients/{recipientId}
    @DeleteMapping("/greenhouses/{id}/alert-recipients/{recipientId}")
    public ResponseEntity<?> remove(@PathVariable int id,
                                    @PathVariable int recipientId) {
        Optional<AlertRecipient> opt = recipientRepository.findById(recipientId);
        if (opt.isEmpty() || opt.get().getGreenhouseId() != id)
            return ResponseEntity.notFound().build();
        recipientRepository.deleteById(recipientId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
```

- [ ] **Step 2: Verify compilation**
```
mvn compile -q
```
Expected: success.

- [ ] **Step 3: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/api/AlertRecipientController.java"
git commit -m "feat: add AlertRecipientController with GET/POST/DELETE /greenhouses/{id}/alert-recipients"
```

---

### Task 7: Backend — NotificationService

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\service\NotificationService.java`

**Required environment variables (set in Render before deploy):**
- `SENDGRID_API_KEY` — API key from SendGrid dashboard
- `SENDGRID_FROM_EMAIL` — verified sender email in SendGrid

- [ ] **Step 1: Create NotificationService.java**

```java
package com.agropulse.service;

import com.agropulse.dao.AlertRecipientRepository;
import com.agropulse.model.AlertRecipient;
import com.agropulse.model.SensorAnomaly;
import com.sendgrid.*;
import com.sendgrid.helpers.mail.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private AlertRecipientRepository recipientRepository;

    @Value("${SENDGRID_API_KEY:}")
    private String sendgridApiKey;

    @Value("${SENDGRID_FROM_EMAIL:noreply@agropulse.app}")
    private String fromEmail;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void notifyAnomaly(SensorAnomaly anomaly, int greenhouseId,
                               String sensorName, String greenhouseName) {
        List<AlertRecipient> recipients = recipientRepository
                .findByGreenhouseIdAndActiveTrue(greenhouseId);
        for (AlertRecipient r : recipients) {
            if (r.getEmail() != null && !r.getEmail().isBlank()) {
                sendEmail(r, anomaly, sensorName, greenhouseName);
            }
            if (r.getPhone() != null && !r.getPhone().isBlank()
                    && r.getCallmebotApikey() != null && !r.getCallmebotApikey().isBlank()) {
                sendWhatsApp(r, anomaly, sensorName, greenhouseName);
            }
        }
    }

    private void sendEmail(AlertRecipient recipient, SensorAnomaly anomaly,
                            String sensorName, String greenhouseName) {
        if (sendgridApiKey == null || sendgridApiKey.isBlank()) return;
        try {
            String subject = "[AgroPulse] ⚠️ Anomalía: " + anomaly.getAnomalyType()
                             + " — Sensor \"" + sensorName + "\"";
            String body = "<h2 style='color:#dc2626'>⚠️ Alerta de Sensor — AgroPulse</h2>"
                + "<p><b>Invernadero:</b> " + greenhouseName + "</p>"
                + "<p><b>Sensor:</b> " + sensorName + "</p>"
                + "<p><b>Tipo de anomalía:</b> " + translateType(anomaly.getAnomalyType()) + "</p>"
                + (anomaly.getValueAtDetection() != null
                    ? "<p><b>Valor detectado:</b> " + anomaly.getValueAtDetection() + "</p>" : "")
                + "<p><b>Hora:</b> " + anomaly.getDetectedAt() + "</p>"
                + "<p><b>Detalle:</b> " + anomaly.getMessage() + "</p>"
                + "<hr><p style='color:#6b7280;font-size:12px'>AgroPulse IoT Monitoring</p>";

            Email from = new Email(fromEmail, "AgroPulse");
            Email to   = new Email(recipient.getEmail(), recipient.getName());
            Content content = new Content("text/html", body);
            Mail mail = new Mail(from, subject, to, content);

            SendGrid sg = new SendGrid(sendgridApiKey);
            Request req = new Request();
            req.setMethod(Method.POST);
            req.setEndpoint("mail/send");
            req.setBody(mail.build());
            Response resp = sg.api(req);
            if (resp.getStatusCode() >= 400) {
                System.err.println("[NotificationService] SendGrid error " + resp.getStatusCode()
                        + ": " + resp.getBody());
            }
        } catch (IOException e) {
            System.err.println("[NotificationService] Email failed: " + e.getMessage());
        }
    }

    private void sendWhatsApp(AlertRecipient recipient, SensorAnomaly anomaly,
                               String sensorName, String greenhouseName) {
        try {
            String text = "⚠️ AgroPulse: " + translateType(anomaly.getAnomalyType())
                    + " en \"" + sensorName + "\" (" + greenhouseName + ")."
                    + (anomaly.getValueAtDetection() != null
                        ? " Valor: " + String.format("%.2f", anomaly.getValueAtDetection()) + "." : "")
                    + " " + anomaly.getDetectedAt().toString().substring(0, 16).replace("T", " ");
            String encoded = URLEncoder.encode(text, StandardCharsets.UTF_8);
            String url = "https://api.callmebot.com/whatsapp.php?phone="
                    + recipient.getPhone() + "&text=" + encoded
                    + "&apikey=" + recipient.getCallmebotApikey();
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req,
                    HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                System.err.println("[NotificationService] CallMeBot error " + resp.statusCode());
            }
        } catch (Exception e) {
            System.err.println("[NotificationService] WhatsApp failed: " + e.getMessage());
        }
    }

    private String translateType(String type) {
        return switch (type) {
            case "OUT_OF_RANGE" -> "Valor fuera de rango";
            case "NO_DATA"      -> "Sin datos del sensor";
            case "STUCK"        -> "Valor constante (sensor posiblemente dañado)";
            case "SPIKE"        -> "Cambio brusco de valor";
            default             -> type;
        };
    }
}
```

- [ ] **Step 2: Verify compilation**
```
mvn compile -q
```
Expected: success. If SendGrid classes are not found, run `mvn dependency:resolve` first.

- [ ] **Step 3: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/service/NotificationService.java"
git commit -m "feat: add NotificationService with SendGrid email and CallMeBot WhatsApp"
```

---

### Task 8: Backend — AnomalyDetectionService

**Files:**
- Create: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\backend AgroPulse\src\main\java\com\agropulse\service\AnomalyDetectionService.java`

- [ ] **Step 1: Create AnomalyDetectionService.java**

```java
package com.agropulse.service;

import com.agropulse.dao.*;
import com.agropulse.model.*;
import com.agropulse.model.enums.AlertLevel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AnomalyDetectionService {

    @Autowired private SensorThresholdRepository thresholdRepository;
    @Autowired private SensorRepository          sensorRepository;
    @Autowired private SensorAnomalyRepository   anomalyRepository;
    @Autowired private AlertRepository           alertRepository;
    @Autowired private NotificationService       notificationService;
    @Autowired private JdbcTemplate              jdbcTemplate;

    @Scheduled(fixedDelay = 120_000)  // runs every 2 minutes
    public void detect() {
        List<SensorThreshold> thresholds = thresholdRepository.findByActiveTrue();
        for (SensorThreshold threshold : thresholds) {
            try {
                processSensor(threshold);
            } catch (Exception e) {
                System.err.println("[AnomalyDetection] Error processing sensor "
                        + threshold.getSensorId() + ": " + e.getMessage());
            }
        }
        sendPendingNotifications();
    }

    private void processSensor(SensorThreshold threshold) {
        int sensorId = threshold.getSensorId();
        Optional<Sensor> sensorOpt = sensorRepository.findById(sensorId);
        if (sensorOpt.isEmpty()) return;
        Sensor sensor = sensorOpt.get();

        LocalDateTime now           = LocalDateTime.now();
        LocalDateTime noDataCutoff  = now.minusMinutes(threshold.getNoDataMinutes());
        LocalDateTime stuckCutoff   = now.minusMinutes(threshold.getStuckMinutes());

        // Query last reading timestamp
        LocalDateTime lastTs = null;
        try {
            lastTs = jdbcTemplate.queryForObject(
                "SELECT MAX(timestamp) FROM sensor_readings WHERE sensor_id = ?",
                LocalDateTime.class, sensorId);
        } catch (Exception ignored) {}

        // B. NO_DATA
        boolean noData = (lastTs == null || lastTs.isBefore(noDataCutoff));
        checkAnomaly(sensorId, "NO_DATA", noData,
            "Sin datos desde hace más de " + threshold.getNoDataMinutes() + " minutos", null);

        if (!noData) {
            double lastVal = sensor.getLastValue();

            // A. OUT_OF_RANGE
            boolean outOfRange = (threshold.getMinValue() != null && lastVal < threshold.getMinValue())
                              || (threshold.getMaxValue() != null && lastVal > threshold.getMaxValue());
            String orMsg = String.format("Valor %.2f fuera de rango [%s — %s]",
                lastVal,
                threshold.getMinValue() != null ? threshold.getMinValue() : "∞",
                threshold.getMaxValue() != null ? threshold.getMaxValue() : "∞");
            checkAnomaly(sensorId, "OUT_OF_RANGE", outOfRange, orMsg, lastVal);

            // C. STUCK — all readings in last stuckMinutes have spread < 0.01
            List<Double> stuckVals = jdbcTemplate.queryForList(
                "SELECT value FROM sensor_readings WHERE sensor_id = ? AND timestamp > ? " +
                "ORDER BY timestamp DESC LIMIT 20",
                Double.class, sensorId, stuckCutoff);
            boolean stuck = false;
            if (stuckVals.size() >= 3) {
                double max = stuckVals.stream().mapToDouble(Double::doubleValue).max().orElse(0);
                double min = stuckVals.stream().mapToDouble(Double::doubleValue).min().orElse(0);
                stuck = (max - min) < 0.01;
            }
            checkAnomaly(sensorId, "STUCK", stuck,
                "Valor constante durante " + threshold.getStuckMinutes() + " minutos (posible daño en sensor)",
                lastVal);

            // D. SPIKE — change > spikePercent between last two readings
            List<Double> lastTwo = jdbcTemplate.queryForList(
                "SELECT value FROM sensor_readings WHERE sensor_id = ? " +
                "ORDER BY timestamp DESC LIMIT 2",
                Double.class, sensorId);
            boolean spike = false;
            if (lastTwo.size() == 2 && Math.abs(lastTwo.get(1)) > 0.001) {
                double change = Math.abs(lastTwo.get(0) - lastTwo.get(1))
                              / Math.abs(lastTwo.get(1));
                spike = change > (threshold.getSpikePercent() / 100.0);
            }
            String spikeMsg = lastTwo.size() == 2
                ? String.format("Cambio brusco: %.2f → %.2f", lastTwo.get(1), lastTwo.get(0))
                : "Cambio brusco detectado";
            checkAnomaly(sensorId, "SPIKE", spike, spikeMsg,
                lastTwo.isEmpty() ? null : lastTwo.get(0));
        }
    }

    private void checkAnomaly(int sensorId, String type, boolean condition,
                               String message, Double value) {
        Optional<SensorAnomaly> existing = anomalyRepository
                .findBySensorIdAndAnomalyTypeAndResolvedAtIsNull(sensorId, type);
        if (condition) {
            if (existing.isEmpty()) {
                SensorAnomaly a = new SensorAnomaly();
                a.setSensorId(sensorId);
                a.setAnomalyType(type);
                a.setMessage(message);
                a.setValueAtDetection(value);
                a.setNotified(false);
                anomalyRepository.save(a);
            }
        } else {
            existing.ifPresent(a -> {
                a.setResolvedAt(LocalDateTime.now());
                anomalyRepository.save(a);
            });
        }
    }

    private void sendPendingNotifications() {
        List<SensorAnomaly> pending = anomalyRepository.findByNotifiedFalse();
        for (SensorAnomaly anomaly : pending) {
            try {
                Optional<Sensor> sensorOpt = sensorRepository.findById(anomaly.getSensorId());
                if (sensorOpt.isEmpty()) {
                    anomaly.setNotified(true);
                    anomalyRepository.save(anomaly);
                    continue;
                }
                Sensor sensor = sensorOpt.get();
                String ghName = getGreenhouseName(sensor.getGreenhouseId());

                // Insert into alerts table so AlertsPage shows it
                Alert alert = new Alert();
                alert.setLevel("OUT_OF_RANGE".equals(anomaly.getAnomalyType())
                               || "NO_DATA".equals(anomaly.getAnomalyType())
                               ? AlertLevel.CRITICAL : AlertLevel.WARNING);
                alert.setMessage(anomaly.getMessage());
                alert.setTitle("Anomalía: " + anomaly.getAnomalyType()
                               + " — " + sensor.getName());
                alert.setType("SENSOR");
                alert.setGreenhouseId(sensor.getGreenhouseId());
                alertRepository.save(alert);

                // Send email + WhatsApp
                notificationService.notifyAnomaly(
                    anomaly, sensor.getGreenhouseId(), sensor.getName(), ghName);

                anomaly.setNotified(true);
                anomalyRepository.save(anomaly);
            } catch (Exception e) {
                System.err.println("[AnomalyDetection] Notification failed for anomaly "
                        + anomaly.getId() + ": " + e.getMessage());
            }
        }
    }

    private String getGreenhouseName(int ghId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT name FROM greenhouses WHERE id = ?", String.class, ghId);
        } catch (Exception e) {
            return "Invernadero #" + ghId;
        }
    }
}
```

- [ ] **Step 2: Verify compilation**
```
mvn compile -q
```
Expected: success.

- [ ] **Step 3: Verify full build**
```
mvn package -DskipTests -q
```
Expected: BUILD SUCCESS, jar file created in `target/`.

- [ ] **Step 4: Commit**
```bash
git add "backend AgroPulse/src/main/java/com/agropulse/service/AnomalyDetectionService.java"
git commit -m "feat: add AnomalyDetectionService with @Scheduled anomaly detection every 2 minutes"
```

---

### Task 9: Frontend — New types

**Files:**
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\frontend AgroPulse\src\types.ts`

- [ ] **Step 1: Read the end of `src/types.ts` to find where to append**

Open `src/types.ts` and scroll to the last export. Add these two interfaces after the last existing type:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript**
```
npx tsc --noEmit
```
Expected: no output (0 errors).

- [ ] **Step 3: Commit**
```bash
git add "frontend AgroPulse/src/types.ts"
git commit -m "feat: add SensorThresholdDto and AlertRecipient types"
```

---

### Task 10: Frontend — SensorRepository threshold methods

**Files:**
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\frontend AgroPulse\src\repositories\SensorRepository.ts`

- [ ] **Step 1: Add import and three methods to SensorRepository.ts**

At the top, change the import line to:
```typescript
import { BaseRepository } from '../core/ApiService'
import type { SensorDto, SensorListResponse, SensorThresholdDto } from '../types'
```

Then add these three methods inside the `SensorRepository` class, after `remove()`:

```typescript
  getThreshold(id: number): Promise<SensorThresholdDto> {
    return this.get(`/api/sensors/${id}/threshold`)
  }

  setThreshold(id: number, data: Partial<SensorThresholdDto>): Promise<SensorThresholdDto> {
    return this.put(`/api/sensors/${id}/threshold`, data)
  }

  deleteThreshold(id: number): Promise<void> {
    return this.delete(`/api/sensors/${id}/threshold`)
  }
```

- [ ] **Step 2: Verify TypeScript**
```
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add "frontend AgroPulse/src/repositories/SensorRepository.ts"
git commit -m "feat: add getThreshold/setThreshold/deleteThreshold to SensorRepository"
```

---

### Task 11: Frontend — GreenhouseRepository recipient methods

**Files:**
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\frontend AgroPulse\src\repositories\GreenhouseRepository.ts`

- [ ] **Step 1: Add import and three methods**

Change the imports at the top to:
```typescript
import { BaseRepository } from '../core/ApiService'
import type {
  GreenhouseDto,
  GreenhouseListResponse,
  UserListResponse,
  AlertRecipient,
} from '../types'
```

Then add these three methods inside `GreenhouseRepository`, after `removeUser()`:

```typescript
  listRecipients(id: number): Promise<{ recipients: AlertRecipient[] }> {
    return this.get(`/api/greenhouses/${id}/alert-recipients`)
  }

  addRecipient(id: number, data: Omit<AlertRecipient, 'id' | 'greenhouseId' | 'active'>): Promise<AlertRecipient> {
    return this.post(`/api/greenhouses/${id}/alert-recipients`, data)
  }

  removeRecipient(id: number, recipientId: number): Promise<void> {
    return this.delete(`/api/greenhouses/${id}/alert-recipients/${recipientId}`)
  }
```

- [ ] **Step 2: Verify TypeScript**
```
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**
```bash
git add "frontend AgroPulse/src/repositories/GreenhouseRepository.ts"
git commit -m "feat: add listRecipients/addRecipient/removeRecipient to GreenhouseRepository"
```

---

### Task 12: Frontend — SensorsPage threshold UI

**Files:**
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\frontend AgroPulse\src\pages\SensorsPage.tsx`

- [ ] **Step 1: Add imports at the top of SensorsPage.tsx**

Add to the existing lucide-react import: `Settings` (if not already imported).
Add to repository imports: `sensorRepository` already exists.
Add type import: add `SensorThresholdDto` to the types import line.

Full updated imports block (replace existing):
```typescript
import { useState, useEffect, useRef } from 'react'
import { Activity, Plus, X, RefreshCw, Cpu, Wifi, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import anime from 'animejs'
import PageHeader from '../components/ui/PageHeader'
import { useAuth } from '../context/AuthContext'
import { sensorRepository, greenhouseRepository } from '../repositories'
import type { SensorDto, SensorThresholdDto } from '../types'
```

- [ ] **Step 2: Add threshold state declarations**

Find the existing state declarations block (lines ~33-52) and add these three after the last existing `useState`:

```typescript
const [expandedThreshold, setExpandedThreshold] = useState<number | null>(null)
const [thresholds,        setThresholds]         = useState<Record<number, SensorThresholdDto>>({})
const [savingThreshold,   setSavingThreshold]    = useState<number | null>(null)
const [thresholdForms,    setThresholdForms]     = useState<Record<number, {
  minValue: string; maxValue: string; noDataMinutes: string; stuckMinutes: string; spikePercent: string
}>>({})
```

- [ ] **Step 3: Load thresholds when sensors load**

In the `loadSensors` function, after `setSensors(filtered)`, add:

```typescript
// Load thresholds for all sensors
const thresholdResults = await Promise.allSettled(
  filtered.map(s => sensorRepository.getThreshold(s.id))
)
const newThresholds: Record<number, SensorThresholdDto> = {}
const newForms: Record<number, { minValue: string; maxValue: string; noDataMinutes: string; stuckMinutes: string; spikePercent: string }> = {}
filtered.forEach((s, i) => {
  const result = thresholdResults[i]
  if (result.status === 'fulfilled') {
    newThresholds[s.id] = result.value
    newForms[s.id] = {
      minValue:      result.value.minValue     != null ? String(result.value.minValue)     : '',
      maxValue:      result.value.maxValue     != null ? String(result.value.maxValue)     : '',
      noDataMinutes: String(result.value.noDataMinutes),
      stuckMinutes:  String(result.value.stuckMinutes),
      spikePercent:  String(result.value.spikePercent),
    }
  } else {
    newForms[s.id] = { minValue: '', maxValue: '', noDataMinutes: '10', stuckMinutes: '30', spikePercent: '50' }
  }
})
setThresholds(newThresholds)
setThresholdForms(prev => ({ ...prev, ...newForms }))
```

- [ ] **Step 4: Add `handleSaveThreshold` function**

Add this function after `handleDelete`:

```typescript
const handleSaveThreshold = async (sensorId: number) => {
  const form = thresholdForms[sensorId]
  if (!form) return
  setSavingThreshold(sensorId)
  try {
    const payload: Partial<SensorThresholdDto> = {
      minValue:      form.minValue      ? parseFloat(form.minValue)      : null,
      maxValue:      form.maxValue      ? parseFloat(form.maxValue)      : null,
      noDataMinutes: form.noDataMinutes ? parseInt(form.noDataMinutes)   : 10,
      stuckMinutes:  form.stuckMinutes  ? parseInt(form.stuckMinutes)    : 30,
      spikePercent:  form.spikePercent  ? parseFloat(form.spikePercent)  : 50,
    }
    const saved = await sensorRepository.setThreshold(sensorId, payload)
    setThresholds(prev => ({ ...prev, [sensorId]: saved }))
    showToast('Umbrales guardados')
    setExpandedThreshold(null)
  } catch (err) {
    showToast('Error guardando umbrales: ' + (err as Error).message)
  }
  setSavingThreshold(null)
}
```

- [ ] **Step 5: Add threshold button and panel inside each sensor card**

In the sensor map render section, find the closing `</div>` of each sensor card (after the location `<p>` tag). Replace:

```tsx
                {s.location && (
                  <p className="text-[11px] mt-2 pl-11 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Cpu size={9} className="inline mr-1" />{s.location}
                  </p>
                )}
              </div>
```

With:

```tsx
                {s.location && (
                  <p className="text-[11px] mt-2 pl-11 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Cpu size={9} className="inline mr-1" />{s.location}
                  </p>
                )}

                {/* Threshold toggle row */}
                <div className="flex items-center justify-between mt-3 pt-2.5"
                     style={{ borderTop: '1px solid rgba(74,222,128,0.08)' }}>
                  {thresholds[s.id] ? (
                    <span className="badge-green text-[10px]">✓ Umbrales configurados</span>
                  ) : (
                    <span className="badge-gray text-[10px]">Sin umbrales</span>
                  )}
                  <button
                    onClick={() => {
                      const next = expandedThreshold === s.id ? null : s.id
                      setExpandedThreshold(next)
                      if (next) {
                        setTimeout(() => {
                          const el = document.getElementById(`threshold-panel-${s.id}`)
                          if (el) anime({ targets: el, opacity: [0, 1], translateY: [-6, 0], duration: 220, easing: 'easeOutCubic' })
                        }, 10)
                      }
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'rgba(74,222,128,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                    <Settings size={11} />
                    {expandedThreshold === s.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                </div>

                {/* Threshold panel */}
                {expandedThreshold === s.id && (
                  <div id={`threshold-panel-${s.id}`}
                       className="mt-2 space-y-2 p-3 rounded-xl"
                       style={{ background: '#051a0a', border: '1px solid rgba(74,222,128,0.10)' }}>
                    <p className="biopunk-label mb-2">Configurar umbrales de alerta</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="biopunk-label block mb-1">Valor mínimo</label>
                        <input type="number" placeholder="ej. 10"
                          value={thresholdForms[s.id]?.minValue ?? ''}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], minValue: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                      <div>
                        <label className="biopunk-label block mb-1">Valor máximo</label>
                        <input type="number" placeholder="ej. 40"
                          value={thresholdForms[s.id]?.maxValue ?? ''}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], maxValue: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="biopunk-label block mb-1">Sin datos (min)</label>
                        <input type="number" placeholder="10"
                          value={thresholdForms[s.id]?.noDataMinutes ?? '10'}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], noDataMinutes: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                      <div>
                        <label className="biopunk-label block mb-1">Constante (min)</label>
                        <input type="number" placeholder="30"
                          value={thresholdForms[s.id]?.stuckMinutes ?? '30'}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], stuckMinutes: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                      <div>
                        <label className="biopunk-label block mb-1">Spike (%)</label>
                        <input type="number" placeholder="50"
                          value={thresholdForms[s.id]?.spikePercent ?? '50'}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], spikePercent: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveThreshold(s.id)}
                      disabled={savingThreshold === s.id}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      style={{ background: '#4ade80', color: '#020d05' }}>
                      {savingThreshold === s.id ? 'Guardando…' : 'Guardar umbrales'}
                    </button>
                  </div>
                )}
              </div>
```

- [ ] **Step 6: Verify TypeScript and build**
```
npx tsc --noEmit
npm run build
```
Expected: 0 TypeScript errors, build success.

- [ ] **Step 7: Commit**
```bash
git add "frontend AgroPulse/src/pages/SensorsPage.tsx"
git commit -m "feat: add per-sensor threshold configuration UI to SensorsPage"
```

---

### Task 13: Frontend — GreenhousePage Alertas tab

**Files:**
- Modify: `C:\Users\Cisna\Documents\Ing Software\Proyecto\AgroPulse\frontend AgroPulse\src\pages\GreenhousePage.tsx`

- [ ] **Step 1: Add import**

In `GreenhousePage.tsx`, update the import at the top to include `AlertRecipient`:
```typescript
import type {
  GreenhouseDto, UserDto, DeviceConfigDto, GpioOptionsDto,
  SensorType, Protocol, ActuatorType, AlertRecipient,
} from '../types'
```

Also add `Bell` to the lucide-react imports if not already present.

- [ ] **Step 2: Update GhTab type (line 20)**

Change:
```typescript
type GhTab = 'users' | 'device'
```
To:
```typescript
type GhTab = 'users' | 'device' | 'alerts'
```

- [ ] **Step 3: Add recipient state declarations**

After the existing state declarations, add:
```typescript
const [ghRecipients,   setGhRecipients]   = useState<Record<number, AlertRecipient[]>>({})
const [recipientForm,  setRecipientForm]  = useState({ name: '', email: '', phone: '+57', callmebotApikey: '' })
const [savingRecipient, setSavingRecipient] = useState(false)
```

- [ ] **Step 4: Add `loadRecipients` function**

After `loadGhUsers`, add:
```typescript
const loadRecipients = async (id: number) => {
  try {
    const data = await greenhouseRepository.listRecipients(id)
    setGhRecipients(prev => ({ ...prev, [id]: data.recipients ?? [] }))
  } catch { setGhRecipients(prev => ({ ...prev, [id]: [] })) }
}
```

- [ ] **Step 5: Call `loadRecipients` in `toggleTab`**

In `toggleTab`, after `if (tab === 'device') loadDeviceConfig(id)`, add:
```typescript
if (tab === 'alerts') loadRecipients(id)
```

- [ ] **Step 6: Add `handleAddRecipient` and `handleRemoveRecipient` functions**

After `handleRemoveUser`, add:
```typescript
const handleAddRecipient = async (ghId: number) => {
  if (!recipientForm.name.trim() || savingRecipient) return
  setSavingRecipient(true)
  try {
    await greenhouseRepository.addRecipient(ghId, {
      name:             recipientForm.name.trim(),
      email:            recipientForm.email.trim() || undefined,
      phone:            recipientForm.phone.trim() !== '+57' ? recipientForm.phone.trim() : undefined,
      callmebotApikey:  recipientForm.callmebotApikey.trim() || undefined,
    })
    setRecipientForm({ name: '', email: '', phone: '+57', callmebotApikey: '' })
    loadRecipients(ghId)
  } catch (err) { alert('Error: ' + (err as Error).message) }
  setSavingRecipient(false)
}

const handleRemoveRecipient = async (ghId: number, recipientId: number) => {
  try {
    await greenhouseRepository.removeRecipient(ghId, recipientId)
    setGhRecipients(prev => ({
      ...prev,
      [ghId]: (prev[ghId] ?? []).filter(r => r.id !== recipientId),
    }))
  } catch (err) { alert('Error: ' + (err as Error).message) }
}
```

- [ ] **Step 7: Add the 🔔 Alertas tab button**

In the expanded panel header buttons area (where `<UserPlus>` and `<Cpu>` buttons are), add after the Dispositivo button:
```tsx
{isAdmin && (
  <button onClick={() => toggleTab(g.id, 'alerts')}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
      expandedId === g.id && ghTab[g.id] === 'alerts'
        ? 'bg-amber-600 text-white' : 'hover:bg-[rgba(245,158,11,0.08)] text-amber-400'
    }`}>
    <Bell size={12} /> Alertas
  </button>
)}
```

- [ ] **Step 8: Add the Alertas tab panel content**

In the expanded panel (inside `{isAdmin && expandedId === g.id && ...}`), after the closing `}` of the Device tab panel (`{ghTab[g.id] === 'device' && ...}`), add:

```tsx
{/* ── Alerts (recipients) tab ── */}
{ghTab[g.id] === 'alerts' && (
  <div className="space-y-3">
    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
      🔔 Destinatarios de alertas
    </p>

    {/* Recipient list */}
    {(ghRecipients[g.id] ?? []).length === 0 ? (
      <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Sin destinatarios configurados
      </p>
    ) : (
      <div className="space-y-2">
        {(ghRecipients[g.id] ?? []).map(r => (
          <div key={r.id} className="flex items-center justify-between rounded-lg px-3 py-2"
               style={{ background: '#0a1e0f' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                   style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                {r.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#e2ffe9' }}>{r.name}</p>
                <div className="flex gap-1 mt-0.5">
                  {r.email    && <span className="badge-gray text-[9px]">📧 Email</span>}
                  {r.phone    && <span className="badge-gray text-[9px]">💬 WhatsApp</span>}
                </div>
              </div>
            </div>
            <button onClick={() => handleRemoveRecipient(g.id, r.id)}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-[rgba(248,113,113,0.1)] transition-colors">
              Quitar
            </button>
          </div>
        ))}
      </div>
    )}

    {/* Add recipient form */}
    <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(74,222,128,0.08)' }}>
      <p className="biopunk-label">Agregar destinatario</p>
      <input placeholder="Nombre *" value={recipientForm.name}
        onChange={e => setRecipientForm(f => ({ ...f, name: e.target.value }))}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
      <input placeholder="Email (opcional)" value={recipientForm.email}
        onChange={e => setRecipientForm(f => ({ ...f, email: e.target.value }))}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
      <input placeholder="+573001234567 (WhatsApp)" value={recipientForm.phone}
        onChange={e => setRecipientForm(f => ({ ...f, phone: e.target.value }))}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
      <input placeholder="CallMeBot API Key (opcional)" value={recipientForm.callmebotApikey}
        onChange={e => setRecipientForm(f => ({ ...f, callmebotApikey: e.target.value }))}
        className="w-full rounded-lg px-3 py-2 text-xs"
        style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
        ¿Cómo obtener mi API Key?{' '}
        <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
           target="_blank" rel="noreferrer"
           style={{ color: '#4ade80' }}>
          Ver instrucciones →
        </a>
      </p>
      <button onClick={() => handleAddRecipient(g.id)}
        disabled={!recipientForm.name.trim() || savingRecipient}
        className="w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
        style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
        {savingRecipient ? 'Guardando…' : '+ Agregar destinatario'}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 9: Verify TypeScript and build**
```
npx tsc --noEmit
npm run build
```
Expected: 0 TypeScript errors, build success.

- [ ] **Step 10: Commit**
```bash
git add "frontend AgroPulse/src/pages/GreenhousePage.tsx"
git commit -m "feat: add Alertas tab to GreenhousePage for managing notification recipients"
```

---

## End-to-End Verification

After all 13 tasks complete and backend is deployed to Render:

1. **Configure a threshold:** Go to Sensores → expand ⚙️ on any sensor → set min/max → Guardar
2. **Configure a recipient:** Go to Invernaderos → expand 🔔 Alertas → add recipient with email
3. **Trigger a test anomaly:** Manually set a sensor's last value outside the configured range via the ESP32 or directly in Supabase
4. **Wait 2 minutes:** The scheduler fires
5. **Check AlertsPage:** Should show a new CRITICAL alert with type "SENSOR"
6. **Check email:** Recipient should receive a SendGrid email

**Environment variables to set in Render before deploy:**
- `SENDGRID_API_KEY` — from SendGrid dashboard → Settings → API Keys
- `SENDGRID_FROM_EMAIL` — verified sender email in SendGrid → Settings → Sender Authentication
