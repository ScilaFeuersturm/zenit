import multiprocessing

bind = "0.0.0.0:8000"
worker_class = "uvicorn.workers.UvicornWorker"

# Un solo worker: el ConnectionManager de WebSockets vive en memoria de proceso,
# así que con >1 worker un mensaje podría no llegar a un socket abierto en otro
# proceso. Para el tráfico esperado de Zenit, 1 worker async sobra; si el
# tráfico HTTP (no WS) crece mucho, separar en dos servicios (HTTP multi-worker
# + WS single-worker) detrás de Nginx.
workers = 1

timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
