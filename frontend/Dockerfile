FROM node:14-alpine AS builder

WORKDIR /app

ARG REACT_APP_BACKEND_URL=http://141.148.179.210:8001
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV GENERATE_SOURCEMAP=false
ENV CI=false

COPY package*.json ./
RUN npm install --legacy-peer-deps && \
    npm install --legacy-peer-deps ajv@^8.8.0 ajv-keywords@^5.0.0

COPY . .
RUN npm run build

FROM node:14-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
