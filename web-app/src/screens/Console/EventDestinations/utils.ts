// This file is part of MinIO Console Server
// Copyright (c) 2021 MinIO, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { NotificationEndpointItem } from "api/consoleApi";
import { IElementValue } from "../Configurations/types";
import { TransformedEndpointItem } from "./types";
import { i18nKey } from "i18n/lang";

export const notifyPostgres = "notify_postgres";
export const notifyMysql = "notify_mysql";
const notifyKafka = "notify_kafka";
const notifyAmqp = "notify_amqp";
const notifyMqtt = "notify_mqtt";
const notifyRedis = "notify_redis";
const notifyNats = "notify_nats";
const notifyElasticsearch = "notify_elasticsearch";
const notifyWebhooks = "notify_webhook";
const notifyNsq = "notify_nsq";
export const notificationTransform = (
  notificationElements: NotificationEndpointItem[],
) => {
  return notificationElements.map((element) => {
    return {
      service_name: `${element.service}:${element.account_id}`,
      name: element.service,
      account_id: element.account_id,
      status: element.status,
    };
  }) as TransformedEndpointItem[];
};

export class DestType {
  static DB: string = "database";
  static Queue: string = "queue";
  static Func: string = "functions";
}

const getImgBaseURL = () => {
  return `${document.baseURI}`;
};

export const destinationList = [
  {
    actionTrigger: notifyPostgres,
    targetTitle: "PostgreSQL",
    logo: `${getImgBaseURL()}postgres-logo.svg`,
    category: DestType.DB,
  },
  {
    actionTrigger: notifyKafka,
    targetTitle: "Kafka",
    logo: `${getImgBaseURL()}kafka-logo.svg`,
    category: DestType.Queue,
  },
  {
    actionTrigger: notifyAmqp,
    targetTitle: "AMQP",
    logo: `${getImgBaseURL()}amqp-logo.svg`,
    category: DestType.Queue,
  },
  {
    actionTrigger: notifyMqtt,
    targetTitle: "MQTT",
    logo: `${getImgBaseURL()}mqtt-logo.svg`,
    category: DestType.Queue,
  },
  {
    actionTrigger: notifyRedis,
    targetTitle: "Redis",
    logo: `${getImgBaseURL()}redis-logo.svg`,
    category: DestType.Queue,
  },
  {
    actionTrigger: notifyNats,
    targetTitle: "NATS",
    logo: `${getImgBaseURL()}nats-logo.svg`,
    category: DestType.Queue,
  },
  {
    actionTrigger: notifyMysql,
    targetTitle: "Mysql",
    logo: `${getImgBaseURL()}mysql-logo.svg`,
    category: DestType.DB,
  },
  {
    actionTrigger: notifyElasticsearch,
    targetTitle: "Elastic Search",
    logo: `${getImgBaseURL()}elasticsearch-logo.svg`,
    category: DestType.DB,
  },
  {
    actionTrigger: notifyWebhooks,
    targetTitle: "Webhook",
    logo: `${getImgBaseURL()}webhooks-logo.svg`,
    category: DestType.Func,
  },
  {
    actionTrigger: notifyNsq,
    targetTitle: "NSQ",
    logo: `${getImgBaseURL()}nsq-logo.svg`,
    category: DestType.Queue,
  },
];

const commonFields = [
  {
    name: "queue_dir",
    label: i18nKey("Queue Directory"),
    required: false,

    tooltip: i18nKey(
      "Staging directory for undelivered messages e.g. '/home/events'",
    ),
    type: "string",
    placeholder: i18nKey("Enter Queue Directory"),
  },
  {
    name: "queue_limit",
    label: i18nKey("Queue Limit"),
    required: false,

    tooltip: i18nKey(
      "Maximum limit for undelivered messages, defaults to '10000'",
    ),
    type: "number",
    placeholder: i18nKey("Enter Queue Limit"),
  },
  {
    name: "comment",
    label: i18nKey("Comment"),
    required: false,
    type: "comment",
    placeholder: i18nKey("Enter custom notes if any"),
  },
];

export const removeEmptyFields = (formFields: IElementValue[]) => {
  const nonEmptyFields = formFields.filter((field) => field.value !== "");

  return nonEmptyFields;
};

export const notificationEndpointsFields: any = {
  [notifyKafka]: [
    {
      name: "brokers",
      label: i18nKey("Brokers"),
      required: true,

      tooltip: i18nKey("Comma separated list of Kafka broker addresses"),
      type: "string",
      placeholder: i18nKey("Enter Brokers"),
    },
    {
      name: "topic",
      label: i18nKey("Topic"),
      tooltip: i18nKey("Kafka topic used for bucket notifications"),
      type: "string",
      placeholder: i18nKey("Enter Topic"),
    },
    {
      name: "sasl_username",
      label: i18nKey("SASL Username"),
      tooltip: i18nKey("Username for SASL/PLAIN or SASL/SCRAM authentication"),
      type: "string",
      placeholder: i18nKey("Enter SASL Username"),
    },
    {
      name: "sasl_password",
      label: i18nKey("SASL Password"),
      tooltip: i18nKey("Password for SASL/PLAIN or SASL/SCRAM authentication"),
      type: "password",
      placeholder: i18nKey("Enter SASL Password"),
    },
    {
      name: "sasl_mechanism",
      label: i18nKey("SASL Mechanism"),
      tooltip: i18nKey("SASL authentication mechanism, default 'PLAIN'"),
      type: "string",
    },
    {
      name: "tls_client_auth",
      label: i18nKey("TLS Client Auth"),
      tooltip: i18nKey(
        "Client Auth determines the Kafka server's policy for TLS client authorization",
      ),
      type: "string",
      placeholder: i18nKey("Enter TLS Client Auth"),
    },
    {
      name: "sasl",
      label: i18nKey("SASL"),
      tooltip: i18nKey("Set to 'on' to enable SASL authentication"),
      type: "on|off",
    },
    {
      name: "tls",
      label: i18nKey("TLS"),
      tooltip: i18nKey("Set to 'on' to enable TLS"),
      type: "on|off",
    },
    {
      name: "tls_skip_verify",
      label: i18nKey("TLS skip verify"),
      tooltip: i18nKey(
        'Trust server TLS without verification, defaults to "on" (verify)',
      ),
      type: "on|off",
    },
    {
      name: "client_tls_cert",
      label: i18nKey("client TLS cert"),
      tooltip: i18nKey("Path to client certificate for mTLS authorization"),
      type: "path",
      placeholder: i18nKey("Enter TLS Client Cert"),
    },
    {
      name: "client_tls_key",
      label: i18nKey("client TLS key"),
      tooltip: i18nKey("Path to client key for mTLS authorization"),
      type: "path",
      placeholder: i18nKey("Enter TLS Client Key"),
    },
    {
      name: "version",
      label: i18nKey("Version"),
      tooltip: i18nKey("Specify the version of the Kafka cluster e.g '2.2.0'"),
      type: "string",
      placeholder: i18nKey("Enter Kafka Version"),
    },
    ...commonFields,
  ],
  [notifyAmqp]: [
    {
      name: "url",
      required: true,
      label: i18nKey("URL"),
      tooltip: i18nKey(
        "AMQP server endpoint e.g. `amqp://myuser:mypassword@localhost:5672`",
      ),
      type: "url",
    },
    {
      name: "exchange",
      label: i18nKey("Exchange"),
      tooltip: i18nKey("Name of the AMQP exchange"),
      type: "string",
      placeholder: i18nKey("Enter Exchange"),
    },
    {
      name: "exchange_type",
      label: i18nKey("Exchange Type"),
      tooltip: i18nKey("AMQP exchange type"),
      type: "string",
      placeholder: i18nKey("Enter Exchange Type"),
    },
    {
      name: "routing_key",
      label: i18nKey("Routing Key"),
      tooltip: i18nKey("Routing key for publishing"),
      type: "string",
      placeholder: i18nKey("Enter Routing Key"),
    },
    {
      name: "mandatory",
      label: i18nKey("Mandatory"),
      tooltip: i18nKey(
        "Quietly ignore undelivered messages when set to 'off', default is 'on'",
      ),
      type: "on|off",
    },
    {
      name: "durable",
      label: i18nKey("Durable"),
      tooltip: i18nKey(
        "Persist queue across broker restarts when set to 'on', default is 'off'",
      ),
      type: "on|off",
    },
    {
      name: "no_wait",
      label: i18nKey("No Wait"),
      tooltip: i18nKey(
        "Non-blocking message delivery when set to 'on', default is 'off'",
      ),
      type: "on|off",
    },
    {
      name: "internal",
      label: i18nKey("Internal"),
      tooltip: i18nKey(
        "Set to 'on' for exchange to be not used directly by publishers, but only when bound to other exchanges",
      ),
      type: "on|off",
    },
    {
      name: "auto_deleted",
      label: i18nKey("Auto Deleted"),
      tooltip: i18nKey(
        "Auto delete queue when set to 'on', when there are no consumers",
      ),
      type: "on|off",
    },
    {
      name: "delivery_mode",
      label: i18nKey("Delivery Mode"),
      tooltip: i18nKey(
        "Set to '1' for non-persistent or '2' for persistent queue",
      ),
      type: "number",
      placeholder: i18nKey("Enter Delivery Mode"),
    },
    ...commonFields,
  ],
  [notifyRedis]: [
    {
      name: "address",
      required: true,
      label: i18nKey("Address"),
      tooltip: i18nKey("Redis server's address e.g. `localhost:6379`"),
      type: "address",
      placeholder: i18nKey("Enter Address"),
    },
    {
      name: "key",
      required: true,
      label: i18nKey("Key"),
      tooltip: i18nKey("Redis key to store/update events, key is auto-created"),
      type: "string",
      placeholder: i18nKey("Enter Key"),
    },
    {
      name: "password",
      label: i18nKey("Password"),
      tooltip: i18nKey("Redis server password"),
      type: "password",
      placeholder: i18nKey("Enter Password"),
    },
    ...commonFields,
  ],
  [notifyMqtt]: [
    {
      name: "broker",
      required: true,
      label: i18nKey("Broker"),
      tooltip: i18nKey("MQTT server endpoint e.g. `tcp://localhost:1883`"),
      type: "uri",
      placeholder: i18nKey("Enter Brokers"),
    },
    {
      name: "topic",
      required: true,
      label: i18nKey("Topic"),
      tooltip: i18nKey("Name of the MQTT topic to publish"),
      type: "string",
      placeholder: i18nKey("Enter Topic"),
    },
    {
      name: "username",
      label: i18nKey("Username"),
      tooltip: i18nKey("MQTT username"),
      type: "string",
      placeholder: i18nKey("Enter Username"),
    },
    {
      name: "password",
      label: i18nKey("Password"),
      tooltip: i18nKey("MQTT password"),
      type: "password",
      placeholder: i18nKey("Enter Password"),
    },
    {
      name: "qos",
      label: i18nKey("QOS"),
      tooltip: i18nKey("Set the quality of service priority, defaults to '0'"),
      type: "number",
      placeholder: i18nKey("Enter QOS"),
    },
    {
      name: "keep_alive_interval",
      label: i18nKey("Keep Alive Interval"),
      tooltip: i18nKey("Keep-alive interval for MQTT connections in s,m,h,d"),
      type: "duration",
      placeholder: i18nKey("Enter Keep Alive Interval"),
    },
    {
      name: "reconnect_interval",
      label: i18nKey("Reconnect Interval"),
      tooltip: i18nKey("Reconnect interval for MQTT connections in s,m,h,d"),
      type: "duration",
      placeholder: i18nKey("Enter Reconnect Interval"),
    },
    ...commonFields,
  ],
  [notifyNats]: [
    {
      name: "address",
      required: true,
      label: i18nKey("Address"),
      tooltip: i18nKey("NATS server address e.g. '0.0.0.0:4222'"),
      type: "address",
      placeholder: i18nKey("Enter Address"),
    },
    {
      name: "subject",
      required: true,
      label: i18nKey("Subject"),
      tooltip: i18nKey("NATS subscription subject"),
      type: "string",
      placeholder: i18nKey("Enter NATS Subject"),
    },
    {
      name: "username",
      label: i18nKey("Username"),
      tooltip: i18nKey("NATS username"),
      type: "string",
      placeholder: i18nKey("Enter NATS Username"),
    },
    {
      name: "password",
      label: i18nKey("Password"),
      tooltip: i18nKey("NATS password"),
      type: "password",
      placeholder: i18nKey("Enter NATS password"),
    },
    {
      name: "token",
      label: i18nKey("Token"),
      tooltip: i18nKey("NATS token"),
      type: "password",
      placeholder: i18nKey("Enter NATS token"),
    },
    {
      name: "tls",
      label: i18nKey("TLS"),
      tooltip: i18nKey("Set to 'on' to enable TLS"),
      type: "on|off",
    },
    {
      name: "tls_skip_verify",
      label: i18nKey("TLS Skip Verify"),
      tooltip: i18nKey(
        'Trust server TLS without verification, defaults to "on" (verify)',
      ),
      type: "on|off",
    },
    {
      name: "ping_interval",
      label: i18nKey("Ping Interval"),
      tooltip: i18nKey(
        "Client ping commands interval in s,m,h,d. Disabled by default",
      ),
      type: "duration",
      placeholder: i18nKey("Enter Ping Interval"),
    },
    {
      name: "streaming",
      label: i18nKey("Streaming"),
      tooltip: i18nKey("Set to 'on' to use streaming NATS server"),
      type: "on|off",
    },
    {
      name: "streaming_async",
      label: i18nKey("Streaming async"),
      tooltip: i18nKey("Set to 'on' to enable asynchronous publish"),
      type: "on|off",
    },
    {
      name: "streaming_max_pub_acks_in_flight",
      label: i18nKey("Streaming max publish ACKS in flight"),
      tooltip: i18nKey(
        "Number of messages to publish without waiting for ACKs",
      ),
      type: "number",
      placeholder: i18nKey("Enter Streaming in flight value"),
    },
    {
      name: "streaming_cluster_id",
      label: i18nKey("Streaming Cluster ID"),
      tooltip: i18nKey("Unique ID for NATS streaming cluster"),
      type: "string",
      placeholder: i18nKey("Enter Streaming Cluster ID"),
    },
    {
      name: "cert_authority",
      label: i18nKey("Cert Authority"),
      tooltip: i18nKey("Path to certificate chain of the target NATS server"),
      type: "string",
      placeholder: i18nKey("Enter Cert Authority"),
    },
    {
      name: "client_cert",
      label: i18nKey("Client Cert"),
      tooltip: i18nKey("Client cert for NATS mTLS auth"),
      type: "string",
      placeholder: i18nKey("Enter Client Cert"),
    },
    {
      name: "client_key",
      label: i18nKey("Client Key"),
      tooltip: i18nKey("Client cert key for NATS mTLS authorization"),
      type: "string",
      placeholder: i18nKey("Enter Client Key"),
    },
    ...commonFields,
  ],
  [notifyElasticsearch]: [
    {
      name: "url",
      required: true,
      label: i18nKey("URL"),
      tooltip: i18nKey(
        "Elasticsearch server's address, with optional authentication info",
      ),
      type: "url",
      placeholder: i18nKey("Enter URL"),
    },
    {
      name: "index",
      required: true,
      label: i18nKey("Index"),
      tooltip: i18nKey(
        "Elasticsearch index to store/update events, index is auto-created",
      ),
      type: "string",
      placeholder: i18nKey("Enter Index"),
    },
    {
      name: "format",
      required: true,
      label: i18nKey("Format"),
      tooltip: i18nKey(
        "'namespace' reflects current bucket/object list and 'access' reflects a journal of object operations, defaults to 'namespace'",
      ),
      type: "enum",
      placeholder: i18nKey("Enter Format"),
    },
    ...commonFields,
  ],
  [notifyWebhooks]: [
    {
      name: "endpoint",
      required: true,
      label: i18nKey("Endpoint"),
      tooltip: i18nKey(
        "Webhook server endpoint e.g. http://localhost:8080/silo/events",
      ),
      type: "url",
      placeholder: i18nKey("Enter Endpoint"),
    },
    {
      name: "auth_token",
      label: i18nKey("Auth Token"),
      tooltip: i18nKey("Opaque string or JWT authorization token"),
      type: "password",
      placeholder: i18nKey("Enter auth_token"),
    },
    ...commonFields,
  ],
  [notifyNsq]: [
    {
      name: "nsqd_address",
      required: true,
      label: i18nKey("NSQD Address"),
      tooltip: i18nKey("NSQ server address e.g. '127.0.0.1:4150'"),
      type: "address",
      placeholder: i18nKey("Enter nsqd_address"),
    },
    {
      name: "topic",
      required: true,
      label: i18nKey("Topic"),
      tooltip: i18nKey("NSQ topic"),
      type: "string",
      placeholder: i18nKey("Enter Topic"),
    },
    {
      name: "tls",
      label: i18nKey("TLS"),
      tooltip: i18nKey("Set to 'on' to enable TLS"),
      type: "on|off",
    },
    {
      name: "tls_skip_verify",
      label: i18nKey("TLS Skip Verify"),
      tooltip: i18nKey(
        'Trust server TLS without verification, defaults to "on" (verify)',
      ),
      type: "on|off",
    },
    ...commonFields,
  ],
};

const serviceToConfigMap: Record<string, string> = {
  webhook: "notify_webhook",
  amqp: "notify_amqp",
  kafka: "notify_kafka",
  mqtt: "notify_mqtt",
  nats: "notify_nats",
  nsq: "notify_nsq",
  mysql: "notify_mysql",
  postgresql: "notify_postgres", //looks different in server response(postgresql as opposed to postgres) from api/admin_notification_endpoints.go
  elasticsearch: "notify_elasticsearch",
  redis: "notify_redis",
};

export const getNotificationConfigKey = (serviceName: string) => {
  return serviceToConfigMap[serviceName];
};
