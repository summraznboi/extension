import { Checkbox, Dropdown, Radio } from 'antd';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import * as bip39 from 'bip39';
import bitcore from 'bitcore-lib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { ADDRESS_TYPES, RESTORE_WALLETS } from '@/shared/constant';
import { AddressType, RestoreWalletType } from '@/shared/types';
import { Button, Card, Column, Content, Grid, Header, Input, Layout, Row, Text } from '@/ui/components';
import { useTools } from '@/ui/components/ActionComponent';
import { AddressTypeCard, AddressTypeCard2 } from '@/ui/components/AddressTypeCard';
import { FooterButtonContainer } from '@/ui/components/FooterButtonContainer';
import { Icon } from '@/ui/components/Icon';
import { TabBar } from '@/ui/components/TabBar';
import { useCreateAccountCallback } from '@/ui/state/global/hooks';
import { fontSizes } from '@/ui/theme/font';
import { amountToSatoshis, copyToClipboard, useWallet } from '@/ui/utils';
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';

import { useNavigate } from '../MainRoute';

function Step0({
  contextData,
  updateContextData
}: {
  contextData: ContextData;
  updateContextData: (params: UpdateContextDataParams) => void;
}) {
  return (
    <Column gap="lg">
      <Text text="Choose a wallet you want to restore from" preset="title-bold" textCenter mt="xl" />
      {RESTORE_WALLETS.map((item, index) => {
        return (
          <Button
            key={index}
            preset="default"
            onClick={() => {
              updateContextData({ tabType: TabType.STEP2, restoreWalletType: item.value });
            }}>
            <Text text={item.name} />
          </Button>
        );
      })}
    </Column>
  );
}

function Step1_Create({
  contextData,
  updateContextData
}: {
  contextData: ContextData;
  updateContextData: (params: UpdateContextDataParams) => void;
}) {
  const [checked, setChecked] = useState(false);

  const wallet = useWallet();
  const tools = useTools();

  const init = async () => {
    const _mnemonics = (await wallet.getPreMnemonics()) || (await wallet.generatePreMnemonic());
    updateContextData({
      mnemonics: _mnemonics
    });
  };

  useEffect(() => {
    init();
  }, []);

  const onChange = (e: CheckboxChangeEvent) => {
    const val = e.target.checked;
    setChecked(val);
    updateContextData({ step1Completed: val });
  };

  function copy(str: string) {
    copyToClipboard(str).then(() => {
      tools.toastSuccess('Copied');
    });
  }

  const btnClick = () => {
    updateContextData({
      tabType: TabType.STEP2
    });
  };

  const words = contextData.mnemonics.split(' ');
  return (
    <Column gap="xl">
      <Text text="Secret Recovery Phrase" preset="title-bold" textCenter />
      <Text
        text="This phrase is the ONLY way to recover your wallet. Do NOT share it with anyone!"
        color="warning"
        textCenter
      />

      <Row
        justifyCenter
        onClick={(e) => {
          copy(contextData.mnemonics);
        }}>
        <Icon icon="copy" color="textDim" />
        <Text text="Copy to clipboard" color="textDim" />
      </Row>

      <Row justifyCenter>
        <Grid columns={2}>
          {words.map((v, index) => {
            return (
              <Row key={index}>
                <Text text={`${index + 1}. `} style={{ width: 40 }} />
                <Card preset="style2" style={{ width: 200 }}>
                  <Text text={v} selectText disableTranslate />
                </Card>
              </Row>
            );
          })}
        </Grid>
      </Row>

      <Row justifyCenter>
        <Checkbox onChange={onChange} checked={checked} style={{ fontSize: fontSizes.sm }}>
          <Text text="I saved My Secret Recovery Phrase" />
        </Checkbox>
      </Row>

      <FooterButtonContainer>
        <Button disabled={!checked} text="Continue" preset="primary" onClick={btnClick} />
      </FooterButtonContainer>
    </Column>
  );
}

function Step1_Import({
  contextData,
  updateContextData
}: {
  contextData: ContextData;
  updateContextData: (params: UpdateContextDataParams) => void;
}) {
  const [keys, setKeys] = useState<Array<string>>(new Array(wordsItems[contextData.wordsType].count).fill(''));
  const [curInputIndex, setCurInputIndex] = useState(0);
  const [hover, setHover] = useState(999);
  const [disabled, setDisabled] = useState(true);

  const handleEventPaste = (event, index: number) => {
    const copyText = event.clipboardData?.getData('text/plain');
    const textArr = copyText.trim().split(' ');
    const newKeys = [...keys];
    if (textArr) {
      for (let i = 0; i < keys.length - index; i++) {
        if (textArr.length == i) {
          break;
        }
        newKeys[index + i] = textArr[i];
      }
      setKeys(newKeys);
    }

    event.preventDefault();
  };

  const onChange = (e: any, index: any) => {
    const newKeys = [...keys];
    newKeys.splice(index, 1, e.target.value);
    setKeys(newKeys);
  };

  useEffect(() => {
    setDisabled(true);

    const hasEmpty =
      keys.filter((key) => {
        return key == '';
      }).length > 0;
    if (hasEmpty) {
      return;
    }

    const mnemonic = keys.join(' ');
    if (!bip39.validateMnemonic(mnemonic)) {
      return;
    }

    setDisabled(false);
  }, [keys]);

  useEffect(() => {
    //todo
  }, [hover]);

  const onNext = () => {
    const mnemonics = keys.join(' ');
    updateContextData({ mnemonics, tabType: TabType.STEP3 });
  };
  const handleOnKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!disabled && 'Enter' == e.key) {
      onNext();
    }
  };

  return (
    <Column gap="lg">
      <Text text="Secret Recovery Phrase" preset="title-bold" textCenter />
      <Text text="Import an existing wallet with your secret recovery phrase" preset="sub" textCenter />

      <Row justifyCenter>
        <Radio.Group
          onChange={(e) => {
            const wordsType = e.target.value;
            updateContextData({ wordsType });
            setKeys(new Array(wordsItems[wordsType].count).fill(''));
          }}
          value={contextData.wordsType}>
          {wordsItems.map((v) => (
            <Radio key={v.key} value={v.key}>
              {v.label}
            </Radio>
          ))}
        </Radio.Group>
      </Row>

      <Row justifyCenter>
        <Grid columns={2}>
          {keys.map((_, index) => {
            return (
              <Row key={index}>
                <Card gap="zero">
                  <Text text={`${index + 1}. `} style={{ width: 25 }} textEnd color="textDim" />
                  <Input
                    containerStyle={{ width: 80, minHeight: 25, height: 25, padding: 0 }}
                    style={{ width: 80 }}
                    value={_}
                    onPaste={(e) => {
                      handleEventPaste(e, index);
                    }}
                    onChange={(e) => {
                      onChange(e, index);
                    }}
                    // onMouseOverCapture={(e) => {
                    //   setHover(index);
                    // }}
                    // onMouseLeave={(e) => {
                    //   setHover(999);
                    // }}
                    onFocus={(e) => {
                      setCurInputIndex(index);
                    }}
                    onBlur={(e) => {
                      setCurInputIndex(999);
                    }}
                    onKeyUp={(e) => handleOnKeyUp(e)}
                    autoFocus={index == curInputIndex}
                  />
                </Card>
              </Row>
            );
          })}
        </Grid>
      </Row>

      <FooterButtonContainer>
        <Button
          disabled={disabled}
          text="Continue"
          preset="primary"
          onClick={() => {
            onNext();
          }}
        />
      </FooterButtonContainer>
    </Column>
  );
}

function Step2({
  contextData,
  updateContextData
}: {
  contextData: ContextData;
  updateContextData: (params: UpdateContextDataParams) => void;
}) {
  const wallet = useWallet();
  const tools = useTools();

  const hdPathOptions = useMemo(() => {
    const restoreWallet = RESTORE_WALLETS[contextData.restoreWalletType];
    return ADDRESS_TYPES.filter((v) => {
      if (v.displayIndex < 0) {
        return false;
      }
      if (!restoreWallet.addressTypes.includes(v.value)) {
        return false;
      }

      if (!contextData.isRestore && v.isUnisatLegacy) {
        return false;
      }

      if (contextData.customHdPath && v.isUnisatLegacy) {
        return false;
      }

      return true;
    })
      .sort((a, b) => a.displayIndex - b.displayIndex)
      .map((v) => {
        return {
          label: v.name,
          hdPath: v.hdPath,
          addressType: v.value,
          isUnisatLegacy: v.isUnisatLegacy
        };
      });
  }, [contextData]);

  const allHdPathOptions = useMemo(() => {
    return ADDRESS_TYPES.sort((a, b) => a.displayIndex - b.displayIndex).map((v) => {
      return {
        label: v.name,
        hdPath: v.hdPath,
        addressType: v.value,
        isUnisatLegacy: v.isUnisatLegacy
      };
    });
  }, []);

  const [previewAddresses, setPreviewAddresses] = useState<string[]>(hdPathOptions.map((v) => ''));

  const [scannedGroups, setScannedGroups] = useState<
    { type: AddressType; address_arr: string[]; satoshis_arr: number[] }[]
  >([]);

  const [addressAssets, setAddressAssets] = useState<{
    [key: string]: { total_btc: string; satoshis: number; total_inscription: number };
  }>({});

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createAccount = useCreateAccountCallback();
  const navigate = useNavigate();

  const [pathText, setPathText] = useState(contextData.customHdPath);

  useEffect(() => {
    if (scannedGroups.length > 0) {
      const option = allHdPathOptions[contextData.addressTypeIndex];
      updateContextData({ addressType: option.addressType });
    } else {
      const option = hdPathOptions[contextData.addressTypeIndex];
      updateContextData({ addressType: option.addressType });
    }
  }, [contextData.addressTypeIndex, scannedGroups]);

  const generateAddress = async () => {
    const addresses: string[] = [];
    for (let i = 0; i < hdPathOptions.length; i++) {
      const options = hdPathOptions[i];
      try {
        const keyring = await wallet.createTmpKeyringWithMnemonics(
          contextData.mnemonics,
          contextData.customHdPath || options.hdPath,
          contextData.passphrase,
          options.addressType
        );
        // const address = keyring.accounts[0].address;
        // addresses.push(address);
        keyring.accounts.forEach((v) => {
          addresses.push(v.address);
        });
      } catch (e) {
        console.log(e);
        setError((e as any).message);
        return;
      }
    }
    setPreviewAddresses(addresses);
  };

  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    generateAddress();
    setScanned(false);
  }, [contextData.passphrase, contextData.customHdPath]);

  const fetchAddressesBalance = async () => {
    if (!contextData.isRestore) {
      return;
    }

    const addresses = previewAddresses;
    if (!addresses[0]) return;

    setLoading(true);
    const balances = await wallet.getMultiAddressAssets(addresses.join(','));
    setLoading(false);

    const addressAssets: { [key: string]: { total_btc: string; satoshis: number; total_inscription: number } } = {};
    let maxSatoshis = 0;
    let recommended = 0;
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const balance = balances[i];
      const satoshis = amountToSatoshis(balance.total_btc);
      addressAssets[address] = {
        total_btc: balance.total_btc,
        satoshis,
        total_inscription: balance.total_inscription
      };
      if (satoshis > maxSatoshis) {
        maxSatoshis = satoshis;
        recommended = i;
      }
    }
    if (maxSatoshis > 0) {
      updateContextData({
        addressTypeIndex: recommended
      });
    }

    setAddressAssets(addressAssets);
  };

  useEffect(() => {
    fetchAddressesBalance();
  }, [previewAddresses]);

  const submitCustomHdPath = () => {
    if (contextData.customHdPath === pathText) return;
    const isValid = bitcore.HDPrivateKey.isValidPath(pathText);
    if (!isValid) {
      setError('Invalid derivation path.');
      return;
    }
    updateContextData({
      customHdPath: pathText
    });
  };

  const resetCustomHdPath = () => {
    updateContextData({
      customHdPath: ''
    });
    setError('');
    setPathText('');
  };

  const onNext = async () => {
    try {
      if (scannedGroups.length > 0) {
        const option = allHdPathOptions[contextData.addressTypeIndex];
        const hdPath = contextData.customHdPath || option.hdPath;
        const selected = scannedGroups[contextData.addressTypeIndex];
        await createAccount(
          contextData.mnemonics,
          hdPath,
          contextData.passphrase,
          contextData.addressType,
          selected.address_arr.length
        );
      } else {
        const option = hdPathOptions[contextData.addressTypeIndex];
        const hdPath = contextData.customHdPath || option.hdPath;
        await createAccount(contextData.mnemonics, hdPath, contextData.passphrase, contextData.addressType, 1);
      }
      navigate('MainScreen');
    } catch (e) {
      tools.toastError((e as any).message);
    }
  };

  const scanVaultAddress = async () => {
    setScanned(true);
    tools.showLoading(true);
    try {
      let groups: { type: AddressType; address_arr: string[]; satoshis_arr: number[] }[] = [];
      for (let i = 0; i < allHdPathOptions.length; i++) {
        const options = allHdPathOptions[i];
        const address_arr: string[] = [];
        const satoshis_arr: number[] = [];
        try {
          const keyring = await wallet.createTmpKeyringWithMnemonics(
            contextData.mnemonics,
            contextData.customHdPath || options.hdPath,
            contextData.passphrase,
            options.addressType,
            10
          );
          keyring.accounts.forEach((v, j) => {
            address_arr.push(v.address);
          });
        } catch (e) {
          console.log(e);
          setError((e as any).message);
          return;
        }

        groups.push({
          type: options.addressType,
          address_arr: address_arr,
          satoshis_arr: satoshis_arr
        });
      }

      groups = await wallet.findGroupAssets(groups);

      setScannedGroups(groups);
      if (groups.length == 0) {
        tools.showTip('Unable to find any addresses with assets');
      }
    } catch (e) {
      setError((e as any).message);
    } finally {
      tools.showLoading(false);
    }
  };

  return (
    <Column>
      {contextData.isRestore && scanned == false ? (
        <Row justifyBetween>
          <Text text="Address Type" preset="bold" />
          <Text
            text="Scan in more addresses..."
            preset="link"
            onClick={() => {
              scanVaultAddress();
            }}
          />
        </Row>
      ) : (
        <Text text="Address Type" preset="bold" />
      )}

      {scannedGroups.length > 0 &&
        scannedGroups.map((item, index) => {
          const options = allHdPathOptions[index];
          if (!item.satoshis_arr.find((v) => v > 0)) {
            // skip group with no vault
            return null;
          }
          return (
            <AddressTypeCard2
              key={index}
              label={`${options.label}`}
              items={item.address_arr.map((v, index) => ({
                address: v,
                satoshis: item.satoshis_arr[index],
                path: (contextData.customHdPath || options.hdPath) + '/' + index
              }))}
              checked={index == contextData.addressTypeIndex}
              onClick={() => {
                updateContextData({
                  addressTypeIndex: index,
                  addressType: options.addressType
                });
              }}
            />
          );
        })}
      {scannedGroups.length == 0 &&
        hdPathOptions.map((item, index) => {
          const address = previewAddresses[index];
          const assets = addressAssets[address] || {
            total_btc: '--',
            satoshis: 0,
            total_inscription: 0
          };
          const hasVault = contextData.isRestore && assets.satoshis > 0;
          if (item.isUnisatLegacy && !hasVault) {
            return null;
          }

          const hdPath = (contextData.customHdPath || item.hdPath) + '/0';
          return (
            <AddressTypeCard2
              key={index}
              label={`${item.label}`}
              items={[
                {
                  address,
                  satoshis: assets.satoshis,
                  path: hdPath
                }
              ]}
              checked={index == contextData.addressTypeIndex}
              onClick={() => {
                updateContextData({
                  addressTypeIndex: index,
                  addressType: item.addressType
                });
              }}
            />
          );
        })}

      <Text text="Custom HdPath (Optional)" preset="bold" mt="lg" />

      <Column>
        <Input
          placeholder={'Custom HD Wallet Derivation Path'}
          value={pathText}
          onChange={async (e) => {
            setError('');
            setPathText(e.target.value);
          }}
          onBlur={(e) => {
            submitCustomHdPath();
          }}
        />
        {contextData.customHdPath && (
          <Icon
            onClick={() => {
              resetCustomHdPath();
            }}>
            <CloseOutlined />
          </Icon>
        )}
      </Column>
      {error && <Text text={error} color="error" />}

      <Text text="Phrase (Optional)" preset="bold" mt="lg" />

      <Input
        placeholder={'Passphrase'}
        defaultValue={contextData.passphrase}
        onChange={async (e) => {
          updateContextData({
            passphrase: e.target.value
          });
        }}
      />

      <FooterButtonContainer>
        <Button text="Continue" preset="primary" onClick={onNext} />
      </FooterButtonContainer>

      {loading && (
        <Icon>
          <LoadingOutlined />
        </Icon>
      )}
    </Column>
  );
}

enum TabType {
  STEP1 = 'STEP1',
  STEP2 = 'STEP2',
  STEP3 = 'STEP3'
}

enum WordsType {
  WORDS_12,
  WORDS_24
}

const wordsItems = [
  {
    key: WordsType.WORDS_12,
    label: '12 words',
    count: 12
  },
  {
    key: WordsType.WORDS_24,
    label: '24 words',
    count: 24
  }
];

interface ContextData {
  mnemonics: string;
  hdPath: string;
  passphrase: string;
  addressType: AddressType;
  step1Completed: boolean;
  tabType: TabType;
  restoreWalletType: RestoreWalletType;
  isRestore: boolean;
  isCustom: boolean;
  customHdPath: string;
  addressTypeIndex: number;
  wordsType: WordsType;
}

interface UpdateContextDataParams {
  mnemonics?: string;
  hdPath?: string;
  passphrase?: string;
  addressType?: AddressType;
  step1Completed?: boolean;
  tabType?: TabType;
  restoreWalletType?: RestoreWalletType;
  isCustom?: boolean;
  customHdPath?: string;
  addressTypeIndex?: number;
  wordsType?: WordsType;
}

export default function CreateHDWalletScreen() {
  const navigate = useNavigate();

  const { state } = useLocation();
  const { isImport, fromUnlock } = state as {
    isImport: boolean;
    fromUnlock: boolean;
  };

  const [contextData, setContextData] = useState<ContextData>({
    mnemonics: '',
    hdPath: '',
    passphrase: '',
    addressType: AddressType.P2WPKH,
    step1Completed: false,
    tabType: TabType.STEP1,
    restoreWalletType: RestoreWalletType.UNISAT,
    isRestore: isImport,
    isCustom: false,
    customHdPath: '',
    addressTypeIndex: 0,
    wordsType: WordsType.WORDS_12
  });

  const updateContextData = useCallback(
    (params: UpdateContextDataParams) => {
      setContextData(Object.assign({}, contextData, params));
    },
    [contextData, setContextData]
  );

  const items = useMemo(() => {
    if (contextData.isRestore) {
      return [
        {
          key: TabType.STEP1,
          label: 'Step 1',
          children: <Step0 contextData={contextData} updateContextData={updateContextData} />
        },
        {
          key: TabType.STEP2,
          label: 'Step 2',
          children: <Step1_Import contextData={contextData} updateContextData={updateContextData} />
        },
        {
          key: TabType.STEP3,
          label: 'Step 3',
          children: <Step2 contextData={contextData} updateContextData={updateContextData} />
        }
      ];
    } else {
      return [
        {
          key: TabType.STEP1,
          label: 'Step 1',
          children: <Step1_Create contextData={contextData} updateContextData={updateContextData} />
        },
        {
          key: TabType.STEP2,
          label: 'Step 2',
          children: <Step2 contextData={contextData} updateContextData={updateContextData} />
        }
      ];
    }
  }, [contextData, updateContextData]);

  const currentChildren = useMemo(() => {
    const item = items.find((v) => v.key === contextData.tabType);
    return item?.children;
  }, [items, contextData.tabType]);

  const activeTabIndex = useMemo(() => {
    const index = items.findIndex((v) => v.key === contextData.tabType);
    if (index === -1) {
      return 0;
    } else {
      return index;
    }
  }, [items, contextData.tabType]);
  return (
    <Layout>
      <Header
        onBack={() => {
          if (fromUnlock) {
            navigate('WelcomeScreen');
          } else {
            window.history.go(-1);
          }
        }}
        title={contextData.isRestore ? 'Restore from mnemonics' : 'Create a new HD Wallet'}
      />
      <Content>
        <Row justifyCenter>
          <TabBar
            progressEnabled
            defaultActiveKey={contextData.tabType}
            activeKey={contextData.tabType}
            items={items.map((v) => ({
              key: v.key,
              label: v.label
            }))}
            onTabClick={(key) => {
              const toTabType = key as TabType;
              if (toTabType === TabType.STEP2) {
                if (!contextData.step1Completed) {
                  setTimeout(() => {
                    updateContextData({ tabType: contextData.tabType });
                  }, 200);
                  return;
                }
              }
              updateContextData({ tabType: toTabType });
            }}
          />
        </Row>

        {currentChildren}
      </Content>
    </Layout>
  );
}
