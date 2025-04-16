FROM node:20-alpine

WORKDIR /app

# Cài đặt dependencies hệ thống
RUN apk add --no-cache libc6-compat

# Copy package.json và package-lock.json
COPY package.json package-lock.json* ./

# Cài đặt dependencies với caching tối ưu
RUN npm ci

# Copy mã nguồn
COPY . .

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null || exit 1

# Khởi động ứng dụng
CMD ["npm", "start"]