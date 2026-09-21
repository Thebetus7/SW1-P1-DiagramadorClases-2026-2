# ==========================================
# ETAPA 1: Compilación y empaquetado Maven
# ==========================================
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /app

# Copiar archivos de Maven Wrapper y dependencias primero para cachear capas
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copiar el código fuente y empaquetar en archivo .jar omitiendo tests unitarios
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ==========================================
# ETAPA 2: Imagen de ejecución ligera (JRE)
# ==========================================
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Crear usuario sin privilegios root por seguridad
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copiar el ejecutable generado desde la etapa de compilación
COPY --from=builder /app/target/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser

# Exponer el puerto interno de Spring Boot
EXPOSE 8080

# Limitar memoria Heap a 384 MB para no agotar la RAM de la instancia gratuita t2/t3.micro
ENV JAVA_OPTS="-Xms128m -Xmx384m -Djava.security.egd=file:/dev/./urandom -Dfile.encoding=UTF-8"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
