FROM alpine

RUN apk add --update --no-cache lighttpd jq curl bash && rm -rf /var/cache/apk/*
RUN chmod a+w /var/www/localhost/htdocs /var/log/lighttpd

COPY lighttpd/lighttpd.conf /etc/lighttpd/
COPY build/static /var/www/localhost/htdocs/static/
COPY build/index.html /var/www/localhost/htdocs/
COPY build/report.sh /opt/
RUN chmod a+x /opt/report.sh

CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]

