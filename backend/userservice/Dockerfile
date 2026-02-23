# Build Stage
FROM golang:1.24 AS builder

WORKDIR /app

# คัดลอก File go.mod และ go.sum เพื่อให้สามารถ Cache Dependency ได้
COPY go.mod go.sum ./
RUN go mod download

# คัดลอก Code ทั้งหมด
COPY . .

# สร้าง File Binary 'main' จาก Source Code ใน cmd/main.go 
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Run Stage
FROM alpine:latest  

RUN apk --no-cache add ca-certificates curl

WORKDIR /root/
# คัดลอก Binary จาก Builder Stage
COPY --from=builder /app/main .
# คัดลอก .env file (ถ้ามี)
COPY .env .env

# กำหนด Entrypoint เป็น Binary main
ENTRYPOINT ["./main"]