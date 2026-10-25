# This image is used only within CI and is never pushed to a registry.
FROM docker.io/pgsty/silo:RELEASE.2026-10-18T00-00-00Z
COPY silo /silo-test
ENV MINIO_CI_CD=1
ENTRYPOINT ["/silo-test"]
