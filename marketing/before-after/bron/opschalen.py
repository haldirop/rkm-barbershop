"""AI upscaling (Real-ESRGAN, model realesr-general-x4v3) without PyTorch, for the before/after video.

The WhatsApp copies of the recordings are small (464 x 832 and 576 x 1024) and blocky; plain scaling
makes them soft. Real-ESRGAN removes the compression blocks and draws sharp edges back (4x), after
which the montage scales the result down to 1080 x 1920: crisp hair, fade and face.

The model (BSD-3, by Xintao Wang et al.) is a small VGG-style network. Its PyTorch weights are read
here directly from the .pth file and rebuilt as an ONNX graph, so it runs with onnxruntime on the CPU.

  python3 opschalen.py model <realesr-general-x4v3.pth> <out.onnx>     # once
  (montage.py uses Upscaler(<out.onnx>) frame by frame, with a cache on disk)
Needs: numpy, onnx, onnxruntime.
"""
import collections
import pickle
import sys
import zipfile
from pathlib import Path

import numpy as np

WEIGHTS_URL = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"


def read_pth(path):
    """The tensors of a PyTorch checkpoint (zip format) as numpy arrays, without importing torch."""
    zf = zipfile.ZipFile(path)
    prefix = zf.namelist()[0].split("/")[0]

    class Unpickler(pickle.Unpickler):
        def find_class(self, module, name):
            if module == "torch._utils" and name == "_rebuild_tensor_v2":
                def rebuild(storage, offset, size, stride, *args):
                    item = storage.itemsize
                    view = np.lib.stride_tricks.as_strided(storage[offset:], shape=size, strides=[s * item for s in stride])
                    return np.array(view)
                return rebuild
            if module == "torch" and name.endswith("Storage"):
                return name
            if module == "collections" and name == "OrderedDict":
                return collections.OrderedDict
            raise pickle.UnpicklingError(f"unexpected {module}.{name}")

        def persistent_load(self, pid):
            _, storage_type, key, _location, _numel = pid
            dtype = np.float16 if storage_type == "HalfStorage" else np.float32
            return np.frombuffer(zf.read(f"{prefix}/data/{key}"), dtype=dtype)

    with zf.open(f"{prefix}/data.pkl") as f:
        data = Unpickler(f).load()
    return data.get("params_ema") or data.get("params") or data


def build_onnx(weights, out_path, upscale=4):
    """SRVGGNetCompact: conv + PReLU blocks, a last conv, pixel shuffle, plus the input upscaled (nearest)."""
    import onnx
    from onnx import TensorProto, helper, numpy_helper

    nodes, inits = [], []
    x = "input"
    indices = sorted({int(k.split(".")[1]) for k in weights if k.startswith("body.")})
    for i in indices:
        w = weights[f"body.{i}.weight"].astype(np.float32)
        if w.ndim == 4:
            b = weights[f"body.{i}.bias"].astype(np.float32)
            inits += [numpy_helper.from_array(w, f"w{i}"), numpy_helper.from_array(b, f"b{i}")]
            nodes.append(helper.make_node("Conv", [x, f"w{i}", f"b{i}"], [f"c{i}"], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
            x = f"c{i}"
        else:  # PReLU, one slope per channel
            inits.append(numpy_helper.from_array(w.reshape(-1, 1, 1), f"p{i}"))
            nodes.append(helper.make_node("PRelu", [x, f"p{i}"], [f"a{i}"]))
            x = f"a{i}"
    nodes.append(helper.make_node("DepthToSpace", [x], ["shuffled"], blocksize=upscale, mode="CRD"))
    inits.append(numpy_helper.from_array(np.array([1, 1, upscale, upscale], np.float32), "scales"))
    nodes.append(helper.make_node("Resize", ["input", "", "scales"], ["base"], mode="nearest"))
    nodes.append(helper.make_node("Add", ["shuffled", "base"], ["output"]))
    graph = helper.make_graph(
        nodes, "srvgg",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, "h", "w"])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, "H", "W"])],
        inits,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)], ir_version=8)  # readable by onnxruntime
    onnx.checker.check_model(model)
    onnx.save(model, out_path)


class Upscaler:
    """4x upscaling of an RGB float image (0–1); results are cached on disk per (clip, frame)."""

    def __init__(self, model_path, cache_dir=None, threads=4):
        import onnxruntime as ort

        opts = ort.SessionOptions()
        opts.intra_op_num_threads = threads
        self.session = ort.InferenceSession(str(model_path), opts, providers=["CPUExecutionProvider"])
        self.cache = Path(cache_dir) if cache_dir else None
        if self.cache:
            self.cache.mkdir(parents=True, exist_ok=True)

    def __call__(self, rgb, key=None):
        path = self.cache / f"{key}.npy" if self.cache and key else None
        if path and path.exists():
            return np.load(path).astype(np.float32) / 255
        x = np.ascontiguousarray(rgb.transpose(2, 0, 1)[None], np.float32)
        y = self.session.run(None, {"input": x})[0][0].transpose(1, 2, 0)
        y = np.clip(y, 0, 1)
        if path:
            np.save(path, (y * 255 + 0.5).astype(np.uint8))
        return y


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "model":
        build_onnx(read_pth(sys.argv[2]), sys.argv[3])
        print("saved", sys.argv[3])
    else:
        sys.exit(__doc__)
