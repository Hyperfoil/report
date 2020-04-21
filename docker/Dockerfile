FROM alpine

RUN apk add --update --no-cache lighttpd jq curl bash && rm -rf /var/cache/apk/*
RUN chmod a+w /var/www/localhost/htdocs /var/log/lighttpd

COPY src/main/resources/lighttpd/lighttpd.conf /etc/lighttpd/
COPY src/main/resources/lighttpd/mod_cgi.conf /etc/lighttpd/
COPY src/main/resources/lighttpd/convert.sh /var/www/localhost/cgi-bin/
COPY src/main/resources/index.html /var/www/

CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]

