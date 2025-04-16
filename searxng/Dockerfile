FROM searxng/searxng:latest

COPY settings.yml /etc/searxng/settings.yml

EXPOSE 8080

CMD ["/sbin/tini", "--", "/usr/local/searxng/dockerfiles/docker-entrypoint.sh"]