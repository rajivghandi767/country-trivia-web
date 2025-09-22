FROM nginx:alpine

RUN apk add --no-cache curl

RUN rm /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /usr/share/nginx/html/static && \
    mkdir -p /usr/share/nginx/html/media && \
    chown -R nginx:nginx /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/nginx-status/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]